import { data } from "./data"
import { render } from "./render"
import { MLP, 反向传播 } from "./T";

// Sigmoid 导数函数
const sigmoidDerivative = (x: number) => {
    const sig = sigmoid(x);
    return sig * (1 - sig);
}
// const sigmoidDerivative = (output: number) => output * (1 - output);

const sigmoid = (x: number) => 1 / (1 + Math.exp(-x))

const sum = (arr: number[]) => arr.reduce((prev, v) => prev + v, 0)

const new_MLP = (arr: number[]): MLP =>
    arr.map((current, i) =>
        Array.from({ length: current }, () => ({
            w: new Float64Array(i === 0 ? 0 : arr[i - 1]).fill(1),
            b: 1,
            d_w: new Float64Array(i === 0 ? 0 : arr[i - 1]),
            d_b: 0,
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



const mlp = new_MLP([28 * 28, 6, 6, 6, 10])

const fx = (index: number) => {
    const d = data.training[index]
    for (let i = 0; i < 100; i++) {
        正向计算(mlp, d.input)
        反向传播(mlp, d.output)
    }
    render(mlp)
}

window.a0 = () => {
    for (let index = 0; index < 10; index++) {
        const d = data.training[index]
        for (let i = 0; i < 100; i++) {
            正向计算(mlp, d.input)
            反向传播(mlp, d.output)
        }
    }
    render(mlp)
}

window.a1 = () => fx(1)
window.a2 = () => fx(2)