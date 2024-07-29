import { data } from "./data"
import { render } from "./render"
import { MLP, } from "./T";

// // Sigmoid 导数函数
// const sigmoidDerivative = (x: number) => {
//     const sig = sigmoid(x);
//     return sig * (1 - sig);
// }

const sigmoid = (x: number) => 1 / (1 + Math.exp(-x))

const sum = (arr: number[]) => arr.reduce((prev, v) => prev + v, 0)

const new_MLP = (arr: number[]): MLP =>
    arr.map((current, i) =>
        Array.from({ length: current }, () => ({
            d_w: new Float64Array(i === 0 ? 0 : arr[i - 1]),
            w: new Float64Array(i === 0 ? 0 : arr[i - 1]),
            b: 0,
            output: 0,
        })))


const 正向计算 = (mlp: MLP, data: number[]) => {
    //输入层
    mlp[0].forEach((v, i) => v.output = data[i])

    //隐藏层 输出层
    for (let i = 1; i < mlp.length; i++) {
        const prev = mlp[i - 1]
        const current = mlp[i]
        current.forEach(c => c.output = sigmoid(sum(prev.map((p, i) => p.output * c.w[i])) + c.b))
    }
}


const set_dw = (mlp: MLP, layerIndex: number, neuronIndex: number, X: number) => {
    const currentNeuron = mlp[layerIndex][neuronIndex]
    const prevLayer = mlp[layerIndex - 1]
    for (let i = 0; i < currentNeuron.w.length; i++) {
        const prevNeuron = prevLayer[i]
        currentNeuron.d_w[i] = X * (1 - currentNeuron.output) * prevNeuron.output
    }
}

const 反向传播 = (mlp: MLP, arr: number[]) => {
    //clearW
    mlp.forEach(layer => layer.forEach(neuron => neuron.d_w = neuron.d_w.map(() => 0)))

    //输出层
    arr.forEach((y, i) => {
        const neuron = mlp[mlp.length - 1][i]
        const X = (neuron.output - y) * neuron.output
        set_dw(mlp, mlp.length - 1, i, X)


        let XX = neuron.d_w[i] * neuron.w[i]

        //隐藏层       
        for (let layerIndex = mlp.length - 2; layerIndex >= 1; layerIndex--) {
            const layer = mlp[layerIndex]
            for (let neuronIndex = 0; neuronIndex < layer.length; neuronIndex++) {
                set_dw(mlp, layerIndex, neuronIndex, XX)
            }
        }
    })

    //updateW
    mlp.forEach(layer => layer.forEach(neuron => neuron.w = neuron.w.map((vv, i) => vv - neuron.d_w[i] * 0.01)))
}

const mlp = new_MLP([28 * 28, 10, 10, 10, 10, 10])

setInterval(() => {
    const d = data.training[0]
    正向计算(mlp, d.input)
    反向传播(mlp, d.output)
    render(mlp)
}, 1)
