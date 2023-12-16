
import '@mediapipe/pose'
import { changePredScore } from './predScore'


import * as posedetection from '@tensorflow-models/pose-detection'
import * as tf from '@vladmandic/tfjs'

import { Camera } from './camera'
import { setupDatGui } from './option_panel'
import { STATE, VIDEO_SIZE } from './params'
import { setupStats } from './stats_panel'
import { setBackendAndEnvFlags } from './util'
import { loadModel } from './model'

let debug = true
let detector, camera, stats, model
let startInferenceTime,
    numInferences = 0
let inferenceTimeSum = 0,
    lastPanelUpdate = 0
let rafId

async function createDetector() {
    const modelType = posedetection.movenet.modelType.SINGLEPOSE_LIGHTNING

    return posedetection.createDetector(STATE.model, { modelType })
}

async function checkGuiUpdate() {
    if (STATE.isTargetFPSChanged || STATE.isSizeOptionChanged) {
        camera = await Camera.setupCamera(STATE.camera)
        STATE.isTargetFPSChanged = false
        STATE.isSizeOptionChanged = false
    }

    if (STATE.isModelChanged || STATE.isFlagChanged || STATE.isBackendChanged) {
        STATE.isModelChanged = true

        window.cancelAnimationFrame(rafId)

        detector.dispose()

        if (STATE.isFlagChanged || STATE.isBackendChanged) {
            await setBackendAndEnvFlags(STATE.flags, STATE.backend)
        }

        detector = await createDetector(STATE.model)
        STATE.isFlagChanged = false
        STATE.isBackendChanged = false
        STATE.isModelChanged = false
    }
}

function beginEstimatePosesStats() {
    startInferenceTime = (performance || Date).now()
}

function endEstimatePosesStats() {
    const endInferenceTime = (performance || Date).now()
    inferenceTimeSum += endInferenceTime - startInferenceTime
    ++numInferences

    const panelUpdateMilliseconds = 1000
    if (endInferenceTime - lastPanelUpdate >= panelUpdateMilliseconds) {
        const averageInferenceTime = inferenceTimeSum / numInferences
        inferenceTimeSum = 0
        numInferences = 0
        stats.customFpsPanel.update(
            1000.0 / averageInferenceTime,
            120 /* maxValue */
        )
        lastPanelUpdate = endInferenceTime
    }
}

async function renderResult() {
    if (camera.video.readyState < 2) {
        await new Promise(resolve => {
            camera.video.onloadeddata = () => {
                resolve(this.video)
            }
        })
    }

    // FPS only counts the time it takes to finish estimatePoses.
    beginEstimatePosesStats()

    // x and y represent the actual keypoint position in the image. If you need normalized
    // keypoint positions, you can use the method
    // `poseDetection.calculator.keypointsToNormalizedKeypoints(keypoints, imageSize)` to
    // convert x and y to [0, 1] range.

    const poses = await detector.estimatePoses(camera.video, {
        maxPoses: STATE.modelConfig.maxPoses,
        flipHorizontal: false
    })

    // let test = [
    //   0.2840069,
    //   0.5042237,
    //   0.76674485,
    //   0.2444461,
    //   0.5827039,
    //   0.75151545,
    //   0.24624714,
    //   0.48238346,
    //   0.7345306,
    //   0.25174516,
    //   0.72856015,
    //   0.42454907,
    //   0.39664304,
    //   0.92749876,
    //   0.7236425,
    //   0.9040086,
    //   0.85314727,
    //   0.6217603,
    //   0.24678431,
    //   0.75014234,
    //   0.841414,
    //   0.59980285
    // ]

    let w = VIDEO_SIZE[STATE.camera.sizeOption].width
    let h = VIDEO_SIZE[STATE.camera.sizeOption].height

    let poses_flat = []
    for (let i = 0; i < 17; i++) {
        poses_flat.push(poses[0].keypoints[i].x / w)
    }
    for (let i = 0; i < 17; i++) {
        poses_flat.push(poses[0].keypoints[i].y / h)
    }
    for (let i = 0; i < 17; i++) {
        poses_flat.push(poses[0].keypoints[i].score)
    }

    if (debug) {
        console.log(`poses`, poses)
        console.log(`poses_flat`, poses_flat)
        // console.log(`w`, w)
        // console.log(`h`, h)
    }

    let points_tensor = tf.tensor([poses_flat])
    // points_tensor = tf.reshape(points_tensor, [1, 51])

    // ten.print()
    // ten = normalize(ten)
    // ten.print()

    // console.log('poses_flat', poses_flat)
    // console.log('poses', poses)

    const pred = await model.predict(points_tensor).data()
    // const norma_pred = pred.sub(dataMin).div(dataMax.sub(dataMin))
    changePredScore(pred)
    console.log(`pred`, pred[0])

    endEstimatePosesStats()

    camera.drawCtx()

    // The null check makes sure the UI is not in the middle of changing to a
    // different model. If during model change, the result is from an old model,
    // which shouldn't be rendered.
    if (poses.length > 0 && !STATE.isModelChanged) {
        camera.drawResults(poses, pred[0])
    }
}

async function renderPrediction() {
    await checkGuiUpdate()

    if (!STATE.isModelChanged) {
        await renderResult()
    }

    rafId = requestAnimationFrame(renderPrediction)
}

async function app() {
    await setupDatGui()

    stats = setupStats()

    camera = await Camera.setupCamera(STATE.camera)

    await setBackendAndEnvFlags(STATE.flags, STATE.backend)

    detector = await createDetector()

    console.log("Detector: ", detector)

    model = await loadModel()

    renderPrediction()
}

app()
