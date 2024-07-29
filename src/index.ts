import { data } from "./data"
import { hiddenLayers, inputNeurons, outputNeurons } from "./svg"


// Sigmoid 函数
const sigmoid = (x: number) => 1 / (1 + Math.exp(-x));

// Sigmoid 导数函数
const sigmoidDerivative = (x: number) => {
    const sig = sigmoid(x);
    return sig * (1 - sig);
}

const sum = (arr: number[]) => {
    let sum = 0
    arr.forEach(v => sum += v)
    return sum
}
const Arr = <T>(size: number, f: (i: number) => T) => new Array(size).fill(0).map(f)

class Neuron {
    w: number[]
    b: number = Math.random()
    value = 0

    constructor(size: number) {
        this.w = Arr(size, Math.random)
    }

    计算(prev: Neuron[]) {
        this.value = sigmoid(sum(prev.map((v, i) => v.value * this.w[i])) + this.b)
    }
}

class Layer {
    neurons: Neuron[]

    constructor(prev: number, current: number) {
        this.neurons = Arr(current, () => new Neuron(prev))
    }

    计算(prev: Layer) {
        this.neurons.forEach(v => v.计算(prev.neurons))
    }
}

class MLP {
    layers: Layer[] = []
    constructor(arr: number[]) {
        for (let i = 0; i < arr.length; i++) {
            this.layers[i] = new Layer(i === 0 ? 0 : arr[i - 1], arr[i])
        }
    }

    计算(data: number[]) {
        //
        this.layers[0].neurons.forEach((v, i) => v.value = data[i])


        for (let i = 1; i < this.layers.length; i++) {
            const prev = this.layers[i - 1]
            const current = this.layers[i]
            current.计算(prev)
        }
    }
}



const v = data.training[0]

const mlp = new MLP([28 * 28, 10, 10, 10, 10])
mlp.计算(v.input)

const render = () => {
    const adjust = (value: number, gray: number) => Math.round(value * gray + (255 - gray * 255))

    const adjustColorBrightness = (gray: number): string => {
        const adjustedR = adjust(0xcc, gray)
        const adjustedG = adjust(0x66, gray)
        const adjustedB = adjust(0xff, gray)
        return `rgb(${adjustedR}, ${adjustedG}, ${adjustedB})`
    }

    mlp.layers[0].neurons.forEach((v, i) => {
        inputNeurons[i].setColor(adjustColorBrightness(v.value))
    })

    for (let i = 1; i < mlp.layers.length - 1; i++) {
        mlp.layers[i].neurons.forEach((v, j) => {
            hiddenLayers[i - 1][j].setColor(adjustColorBrightness(v.value))
        })
    }


    mlp.layers[mlp.layers.length - 1].neurons.forEach((v, i) => {
        outputNeurons[i].setColor(adjustColorBrightness(v.value))
    })

}

render()