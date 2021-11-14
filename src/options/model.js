import { loadLayersModel } from '@vladmandic/tfjs'

export async function loadModel() {
  const model = await loadLayersModel('http://192.168.0.80:8080/128/model.json')
  console.log("model:", model)
  return model
}