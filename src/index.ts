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
    d_w: number[]
    w: number[]
    b = 0// Math.random()
    output = 0

    constructor(size: number) {
        this.d_w = Arr(size, () => 0)
        this.w = Arr(size, Math.random)
    }

    计算(prev: Neuron[]) {
        this.output = sigmoid(sum(prev.map((v, i) => v.output * this.w[i])) + this.b)
    }
    clearW() { this.d_w = this.d_w.map(() => 0) }
    updateW() { this.w = this.w.map((v, i) => v - this.d_w[i] * 0.01) }
}

class Layer {
    neurons: Neuron[]

    constructor(prev: number, current: number) {
        this.neurons = Arr(current, () => new Neuron(prev))
    }

    计算(prev: Layer) {
        this.neurons.forEach(v => v.计算(prev.neurons))
    }

    clearW() { this.neurons.forEach(v => v.clearW()) }
    updateW() { this.neurons.forEach(v => v.updateW()) }
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
        this.layers[0].neurons.forEach((v, i) => v.output = data[i])


        for (let i = 1; i < this.layers.length; i++) {
            const prev = this.layers[i - 1]
            const current = this.layers[i]
            current.计算(prev)
        }
    }

    clearW() {
        for (let i = 1; i < this.layers.length; i++) {
            this.layers[i].clearW()
        }
    }

    updateW() {
        for (let i = 1; i < this.layers.length; i++) {
            this.layers[i].updateW()
        }
    }

    反向(arr: number[]) {
        this.clearW()

        arr.forEach((y, i) => {
            const neuron = this.layers[this.layers.length - 1].neurons[i]
            const X = (neuron.output - y) * neuron.output
            this.set_dw(this.layers.length - 1, i, X)

            //
            const XX = neuron.d_w[i] * neuron.w[i]
            for (let li = this.layers.length - 2; li >= 1; li--) {
                const test = this.layers[li].neurons
                for (let i = 0; i < test.length; i++) {
                    this.set_dw(this.layers.length - 2, i, XX)
                }
            }
        })

        this.updateW()
    }

    set_dw(layerIndex: number, neuronIndex: number, X: number) {
        const current = this.layers[layerIndex].neurons[neuronIndex]
        for (let i = 0; i < current.w.length; i++) {
            const prev = this.layers[layerIndex - 1].neurons[i]
            current.d_w[i] = X * (1 - current.output) * prev.output
        }
    }



}





const mlp = new MLP([28 * 28, 10, 10, 10, 10])


const render = () => {
    const adjust = (value: number, gray: number) => Math.round(value * gray + (255 - gray * 255))

    const adjustColorBrightness = (gray: number): string => {
        const adjustedR = adjust(0xcc, gray)
        const adjustedG = adjust(0x66, gray)
        const adjustedB = adjust(0xff, gray)
        return `rgb(${adjustedR}, ${adjustedG}, ${adjustedB})`
    }

    mlp.layers[0].neurons.forEach((v, i) => {
        inputNeurons[i].setColor(adjustColorBrightness(v.output))
    })

    for (let i = 1; i < mlp.layers.length - 1; i++) {
        mlp.layers[i].neurons.forEach((v, j) => {
            hiddenLayers[i - 1][j].setColor(adjustColorBrightness(v.output))
        })
    }


    mlp.layers[mlp.layers.length - 1].neurons.forEach((v, i) => {
        outputNeurons[i].setColor(adjustColorBrightness(v.output))
    })

}


setInterval(() => {
    render()
    const v = data.training[0]
    mlp.计算(v.input)
    mlp.反向(v.output)
}, 1)
