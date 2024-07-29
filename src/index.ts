import { data } from "./data"
import { inputNeurons } from "./svg"

data.training[0].input.forEach((v, i) => {
    inputNeurons[Math.floor(i / 28)][i % 28].setColor(v > 0 ? '#cc66ff' : '#ffffff')
})
