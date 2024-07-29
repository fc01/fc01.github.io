import { data } from "./data"
import { render } from "./render"
import { sum } from "./sum";
import { MLP, Neuron, 反向传播 } from "./T";

// Sigmoid 导数函数
const sigmoidDerivative = (x: number) => {
    const sig = sigmoid(x);
    return sig * (1 - sig);
}
// const sigmoidDerivative = (output: number) => output * (1 - output);

const sigmoid = (x: number) => 1 / (1 + Math.exp(-x))



const new_MLP = (arr: number[]): MLP =>
    arr.map((current, i) =>
        Array.from({ length: current }, () => (<Neuron>{
            w: new Float64Array(i === 0 ? 0 : arr[i - 1]).map(() => Math.random() - 0.5),
            b: Math.random() - 0.5,
            d_w: new Float64Array(i === 0 ? 0 : arr[i - 1]).fill(0),
            d_b: 0,
            d_w_废弃_不用_arr: [],
            d_b_废弃_不用_arr: [],
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

const clear_w_b = (mlp: MLP) =>
    mlp.forEach(layer => layer.forEach(neuron => {
        neuron.d_w.fill(0)
        neuron.d_b = 0
        neuron.d_w_废弃_不用_arr = []
        neuron.d_b_废弃_不用_arr = []
    }))

const push_w_b = (mlp: MLP) =>
    mlp.forEach(layer => layer.forEach(neuron => {
        neuron.d_w_废弃_不用_arr.push(neuron.d_w)
        neuron.d_b_废弃_不用_arr.push(neuron.d_b)
    }))

const set_w_b_平均 = (mlp: MLP) =>
    mlp.forEach(layer => layer.forEach(neuron => {
        const size = neuron.d_b_废弃_不用_arr.length
        neuron.d_w = neuron.d_w_废弃_不用_arr[0].map((_, k) => {
            return sum(neuron.d_w_废弃_不用_arr.map((_, i) => neuron.d_w_废弃_不用_arr[i][k])) / size
        })
        neuron.d_b = sum(neuron.d_b_废弃_不用_arr) / size
    }))

const update_w_b = (mlp: MLP) => {
    mlp.forEach(layer => layer.forEach(neuron => {
        neuron.w = neuron.w.map((v, i) => v - neuron.d_w[i] * 0.01)
        neuron.b = neuron.b - neuron.d_b * 0.01
    }))
}

const mlp = new_MLP([28 * 28, 10, 10, 10, 10])

const fx = (index: number) => {
    const d = data.training[index]

    正向计算(mlp, d.input)

    for (let i = 0; i < 100; i++) {
        clear_w_b(mlp)
        反向传播(mlp, d.output)
        // push_w_b(mlp)
        // set_w_b_平均(mlp)
        update_w_b(mlp)
    }


    render(mlp)
}

window.a0 = () => {
    for (let i = 0; i < 100; i++) {
        clear_w_b(mlp)
        for (let index = 0; index < 10; index++) {
            const d = data.training[index]
            正向计算(mlp, d.input)
            反向传播(mlp, d.output)
            push_w_b(mlp)
        }
        set_w_b_平均(mlp)
        update_w_b(mlp)
    }
    fx(Math.floor(Math.random() * 10))
}

window.a1 = () => fx(1)
window.a2 = () => fx(2)