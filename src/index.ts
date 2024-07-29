import { data } from "./data"
import { render } from "./render"
import { MLP, } from "./T";


const sigmoid = (x: number) => 1 / (1 + Math.exp(-x))



// // Sigmoid 导数函数
// const sigmoidDerivative = (x: number) => {
//     const sig = sigmoid(x);
//     return sig * (1 - sig);
// }

const sum = (arr: number[]) => arr.reduce((prev, v) => prev + v, 0)

const new_MLP = (arr: number[]): MLP => ({
    layers: arr.map((current, i) => {
        const prev = i === 0 ? 0 : arr[i - 1]
        return {
            neurons: Array.from({ length: current }, () => ({
                d_w: new Float64Array(prev),
                w: new Float64Array(prev),
                b: 0,
                output: 0,
            })),
        }
    })
})


const 计算 = (mlp: MLP, data: number[]) => {
    //
    const first = mlp.layers[0].neurons
    first.forEach((v, i) => v.output = data[i])

    for (let i = 1; i < mlp.layers.length; i++) {
        const prev = mlp.layers[i - 1].neurons
        const current = mlp.layers[i].neurons

        current.forEach(neuron => {
            neuron.output = sigmoid(
                sum(prev.map((v, i) => v.output * neuron.w[i])) + neuron.b
            )
        })
    }
}


const set_dw = (mlp: MLP, layerIndex: number, neuronIndex: number, X: number) => {
    const current = mlp.layers[layerIndex].neurons[neuronIndex]
    for (let i = 0; i < current.w.length; i++) {
        const prev = mlp.layers[layerIndex - 1].neurons[i]
        current.d_w[i] = X * (1 - current.output) * prev.output
    }
}

const 反向 = (mlp: MLP, arr: number[]) => {
    //clearW
    for (let i = 1; i < mlp.layers.length; i++) {
        mlp.layers[i].neurons.forEach(v => {
            v.d_w = v.d_w.map(() => 0)
        })
    }

    //
    arr.forEach((y, i) => {
        const neuron = mlp.layers[mlp.layers.length - 1].neurons[i]
        const X = (neuron.output - y) * neuron.output
        set_dw(mlp, mlp.layers.length - 1, i, X)

        //
        const XX = neuron.d_w[i] * neuron.w[i]
        for (let li = mlp.layers.length - 2; li >= 1; li--) {
            const test = mlp.layers[li].neurons
            for (let i = 0; i < test.length; i++) {
                set_dw(mlp, mlp.layers.length - 2, i, XX)
            }
        }
    })

    //updateW
    for (let i = 1; i < mlp.layers.length; i++) {
        mlp.layers[i].neurons.forEach(v => {
            v.w = v.w.map((vv, i) => vv - v.d_w[i] * 0.01)
        })
    }
}

const mlp = new_MLP([28 * 28, 10, 10, 10, 10])



setInterval(() => {
    render(mlp)
    const v = data.training[0]
    计算(mlp, v.input)
    反向(mlp, v.output)
}, 1)
