import { isJson, stringToArrayBuffer } from './util';
import fetch from 'node-fetch';
import WebSocket from 'ws';
const BSON = require('bson');

const gatherTownApiKey = "Vkhxc8mVSbrrBj9K";
const gatherTownRoomPassword = "the12thvirtue";

export const getGatherTownUsers = async (password: string, roomId: string, roomName: string) => {
  console.log("Performing first fetch");
  // Register new user to Firebase
  const authResponse = await fetch("https://www.googleapis.com/identitytoolkit/v3/relyingparty/signupNewUser?key=AIzaSyCifrUkqu11lgjkz2jtp4Fx_GJh58HDlFQ", {
    "headers": {
      "accept": "*/*",
      "accept-language": "en-US,en;q=0.9",
      "cache-control": "no-cache",
      "content-type": "application/json",
      "pragma": "no-cache",
      "sec-fetch-dest": "empty",
      "sec-fetch-mode": "cors",
      "sec-fetch-site": "cross-site",
      "x-client-version": "Chrome/JsCore/7.16.0/FirebaseCore-web"
    },
    "body": "{\"returnSecureToken\":true}",
    "method": "POST"
  });

  const parsedResponse = await authResponse.json();
  const token = parsedResponse.idToken;

  console.log("Performing second fetch");
  // Get user information
  const userInformation = await fetch("https://www.googleapis.com/identitytoolkit/v3/relyingparty/getAccountInfo?key=AIzaSyCifrUkqu11lgjkz2jtp4Fx_GJh58HDlFQ", {
    "headers": {
      "accept": "*/*",
      "accept-language": "en-US,en;q=0.9,de-DE;q=0.8,de;q=0.7",
      "cache-control": "no-cache",
      "content-type": "application/json",
      "pragma": "no-cache",
      "sec-fetch-dest": "empty",
      "sec-fetch-mode": "cors",
      "sec-fetch-site": "cross-site",
      "x-client-data": "CIa2yQEIpbbJAQjBtskBCKmdygEImbXKAQj1x8oBCOfIygEI6cjKAQj0zcoBCNvVygEI+tjKAQ==",
      "x-client-version": "Chrome/JsCore/7.16.0/FirebaseCore-web"
    },
    "body": JSON.stringify({ idToken: token }),
    "method": "POST",
  });

  const parsedUserInformation = await userInformation.json()
  console.log(parsedUserInformation);

  const localId = parsedUserInformation.users[0].localId

  console.log("Registering user");
  // Register user to Gather Town
  const registerUserResult = await fetch(`https://gather.town/api/registerUser?roomId=${roomId}%5C${roomName}&authToken=${token}`, {
    "headers": {
      "accept": "application/json, text/plain, */*",
      "accept-language": "en-US,en;q=0.9,de-DE;q=0.8,de;q=0.7",
      "cache-control": "no-cache",
      "pragma": "no-cache",
      "sec-fetch-dest": "empty",
      "sec-fetch-mode": "cors",
      "sec-fetch-site": "same-origin"
    },
    "body": undefined,
    "method": "GET",
  });
  
  if (!registerUserResult.ok) {
    console.error("FAILED");
    return;
  }

  console.log("Submitting password");
  // Enter password
  const submitPasswordResult = await fetch("https://gather.town/api/submitPassword", {
    "headers": {
      "accept": "application/json, text/plain, */*",
      "accept-language": "en-US,en;q=0.9,de-DE;q=0.8,de;q=0.7",
      "cache-control": "no-cache",
      "content-type": "application/json;charset=UTF-8",
      "pragma": "no-cache",
      "sec-fetch-dest": "empty",
      "sec-fetch-mode": "cors",
      "sec-fetch-site": "same-origin",
    },
    "body": `{"roomId":"${roomId}\\\\${roomName}","password":"${password}","authUser":"${localId}"}`,
    "method": "POST"
  });
  if (!submitPasswordResult.ok) {
    console.log("FAILED");
    //return;
  }

  console.log("Creating WebSocket connection");
  // Create WebSocket connection.
  //const socket = new WebSocket(`wss://premium-029.gather.town/?token=${token}`);
  console.log(`Attempting to connect with token: ${token}`);
  const socket = new WebSocket(`wss://premium-029.gather.town/`);
  socket.on('open', function (data: any) {
    sendMessageOnSocket(socket, {
      event:"init",
      token:token,
      version:2
    });
  });

  let players: any = {}

  socket.on('message', function (data: any) {
    console.log("Received WebSocket message");
    const firstByte: any = data.readUInt8(0);
    if (firstByte === 0) {
      // A JSON message
      const jsonResponse = messageToJson(data);
      if (jsonResponse) {
        if (jsonResponse.event === "ready") {
          console.log("Received ready message");
          sendMessageOnSocket(socket, {
            event:"rpc",
            target:"space",
            args:{
              type: "subscribe",
              space: `${roomId}\\${roomName}`,
            },
          });
        }
      }
    } else if (firstByte === 1) {
      // A binary message
      const parsedMessage = interpretBinaryMessage(data);
      if (parsedMessage && parsedMessage.players) {
        for (let player of parsedMessage.players) {
          players[player.name] = player;
        }
      }
    }
  });

  // We wait 3s for any responses to arrive via the socket message
  await wait(3000);

  socket.close();

  console.log("Done");
  return players
}

const sendMessageOnSocket = (socket: any, message: any) => {
  const arrayBuffer = stringToArrayBuffer(JSON.stringify(message));
  socket.send(arrayBuffer)
}

const messageToJson = (data: any) => {
  const firstByte = data[0];
  if (firstByte === 0) {
    const messageBody = data.toString('utf8').substring(1)
    if (isJson(messageBody)) {
      try {
        return JSON.parse(messageBody);
      } catch(e) {
        console.log("Failed to parse JSON message");
      }
    }
  } else if (firstByte === 1) {
    const omitFirstByte = Buffer.from(data, 1, data.length-1);
    try {
      return BSON.deserialize(omitFirstByte);
    } catch(e) {
      console.log("Failed to parse BSON message");
      console.log(e);
    }
  } else {
    return null;
  }
}

const playerMessageHeaderLen = 23;
const mapNameOffset = 15
const playerNameOffset = 17
const playerIdOffset = 21;

function interpretBinaryMessage(data: any): any {
  const buf = Buffer.from(data);
  // First byte is 1 to indicate it's a binary message
  if (buf.readUInt8(0) !== 1) {
    console.log("Not a recognizable binary message");
    return null;
  }
  // Second byte is the length of string roomId\roomName
  const targetSpaceLen = buf.readUInt8(1);
  
  // This is followed by a series of messages where the first byte is a message
  // type. The message lengths/alignment are unfortunately not marked. We only
  // understand message type 0 (player metadata).
  let pos = 2+targetSpaceLen;
  const players = [];
  while (pos < buf.length) {
    const messageType = buf.readUInt8(pos);
    if (messageType === 0) {
      console.log("Parsing a player metadata");
      const mapNameLen = buf.readUInt8(pos+mapNameOffset);
      const playerNameLen = buf.readUInt8(pos+playerNameOffset);
      const playerIdLen = buf.readUInt8(pos+playerIdOffset);
      
      const mapNameStart = pos+playerMessageHeaderLen;
      const playerNameStart = mapNameStart+mapNameLen;
      const playerIdStart = playerNameStart+playerNameLen;
      
      const mapName = buf.slice(mapNameStart, mapNameStart+mapNameLen).toString("utf8");
      const playerName = buf.slice(playerNameStart, playerNameStart+playerNameLen).toString("utf8");
      const playerId = buf.slice(playerIdStart, playerIdStart+playerIdLen).toString("utf8");
      
      players.push({
        map: mapName,
        name: playerName,
        id: playerId,
      });
      
      pos = playerIdStart+playerIdLen;
    } else {
      // Unrecognized message type. Return what we have so far.
      console.log("Unrecognized binary message type: "+messageType);
      return {players};
    }
  }
  
  return {players};
}

export interface GatherTownMap {
  id: string
  description: string
  version: string // Presumably internal GatherTown software version. v2.0.2
  dimensions: [number,number]
  objectSizes: number // Have only seen this be 32
  isPublic: boolean
  
  spaces: Array<{
    spaceId: string
    colored: boolean
    x: number
    y: number
  }>
  
  announcer: Array<{x: number, y: number}>
  spawns: Array<{x:number, y:number}>
  
  collisions: string // base64 encoded, 1 byte per tile, 0=passable 1=blocked
  backgroundImagePath: string
  foregroundImagePath: string
  portals: Array<{
    x: number
    y: number
    targetX: number
    targetY: number
    targetMap: string
  }>
  assets: Array<any> // purpose unclear, haven't seen this array nonempty
  isTemplate: boolean
  objects: Array<{
    properties: {
      url?: string
      loading?: string
      deterministicUrlPrefix?: string
    }
    x: number
    y: number
    width: number
    height: number
    scale: number
    normal: string // image URL
    highlighted: string // image URL
    previewMessage?: string // text shown when nearby
    
    // Object type
    // 0: Decorative (eg a potted plant). Has no properties or interactions
    // 1: Iframe object (eg a whiteboard)
    type: number
  }>
}

export const getGatherTownMap = async (spaceId: string, mapId: string): Promise<GatherTownMap> => {
  const result = await fetch(`https://gather.town/api/getMap?apiKey=${gatherTownApiKey}&spaceId=${spaceId}&mapId=${mapId}`, {
    method: "GET",
    "headers": {
      "accept": "*/*",
      "accept-language": "en-US,en;q=0.9",
      "cache-control": "no-cache",
      "content-type": "application/json",
      "pragma": "no-cache",
    }
  });
  if (!result.ok) throw new Error(result.statusText);
  return await result.json() as GatherTownMap;
}

export const setGatherTownMap = async (spaceId: string, mapId: string, mapContent: GatherTownMap): Promise<void> => {
  const result = await fetch(`https://gather.town/api/setMap`, {
    method: "POST",
    "headers": {
      "accept": "*/*",
      "accept-language": "en-US,en;q=0.9",
      "cache-control": "no-cache",
      "content-type": "application/json",
      "pragma": "no-cache",
    },
    body: JSON.stringify({
      apiKey: gatherTownApiKey,
      spaceId, mapId,
      mapContent
    })
  });
  if (!result.ok) throw new Error(result.statusText);
}

// Wait utility function
const wait = (ms: number) => new Promise((r, j) => setTimeout(r, ms))

