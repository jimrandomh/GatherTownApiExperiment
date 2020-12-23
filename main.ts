import { getGatherTownUsers, getGatherTownMap, setGatherTownMap } from './gatherTownUtil';
const { createCanvas } = require('canvas')

const drawText = (): string => {
  const canvas = createCanvas(32, 32)
  const ctx = canvas.getContext('2d')
  
  // White background
  ctx.fillStyle = 'white';
  ctx.fillRect(0, 0, 200, 200);
  
  // Write "Awesome!"
  ctx.fillStyle = 'black';
  ctx.font = '10px Roboto'
  ctx.fillText('Hello', 2, 15)
  ctx.fillText('World', 2, 30)
 
  return canvas.toDataURL();
}

const main = async () => {
  const gatherTownUsers = await getGatherTownUsers("the12thvirtue", "aPVfK3G76UukgiHx", "lesswrong-campus");
  console.log(JSON.stringify(gatherTownUsers));
  
  /*const spaceId = "Opi8cU6UFUzjqFm6\\jimrandomh";
  const mapId = "LesswrongOffice";
  let gatherTownMap = await getGatherTownMap(spaceId, mapId);
  
  const generatedImage = drawText();
  
  gatherTownMap.objects.push({
    properties: {},
    x: 10,
    y: 10,
    width: 2,
    height: 2,
    scale: 1,
    normal: generatedImage,
    highlighted: generatedImage,
    previewMessage: "This is the Pomodoro Timer",
    
    type: 0,
  });
  
  await setGatherTownMap(spaceId, mapId, gatherTownMap);*/
}

main();
