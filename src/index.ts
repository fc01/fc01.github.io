import { data } from "./data"
import { inputNeurons, outputNeurons } from "./svg"

const v = data.training[0]

v.input.forEach((v, i) => {
    inputNeurons[Math.floor(i / 28)][i % 28].setColor(v > 0 ? '#cc66ff' : '#ffffff')
})

v.output.forEach((v, i) => {
    outputNeurons[i].setColor(v > 0 ? '#cc66ff' : '#ffffff')
})
