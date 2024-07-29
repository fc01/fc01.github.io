import { sum } from "./sum"

export type Neuron = {
    w: Float64Array
    b: number
    d_w: Float64Array
    d_b: number
    d_w_arr: Float64Array[]
    d_b_arr: number[]
    output: number //输出缓存
}
export type Layer = Neuron[]
export type MLP = Layer[] //第1层是 输入层 output直接有数据 最后一层是输出层

export const clear_w_b = (mlp: MLP) =>
    mlp.forEach(layer => layer.forEach(neuron => {
        neuron.d_w.fill(0)
        neuron.d_b = 0
        neuron.d_w_arr = []
        neuron.d_b_arr = []
    }))

export const push_w_b = (mlp: MLP, w: Float64Array, b: number) =>
    mlp.forEach(layer => layer.forEach(neuron => {
        neuron.d_w_arr.push(neuron.d_w)
        neuron.d_b_arr.push(neuron.d_b)
    }))

export const update_w_b = (mlp: MLP) => {

    mlp.forEach(layer => layer.forEach(neuron => {
        const size = neuron.d_b_arr.length

        const dw = new Float64Array(neuron.w.length)
        dw.forEach((_, i) => {
            dw[i] = sum(neuron.d_w_arr.map(v => v[i])) / size
        })

        const db = sum(neuron.d_b_arr) / size

        neuron.w = neuron.w.map((vv, i) => vv - dw[i] * 0.001)
        neuron.b = neuron.b - db * 0.001
    }))
}


//output已经计算好输出值了
//clear_w_b 和  update_w_b 中间 实现更新 d_w d_b 代码 调用 push_w_b
//误差函数 是 (target-output)的平方/2
//链式求导
//中文注释

/**
 * 计算均方误差损失函数的导数
 * @param target 目标值
 * @param output 实际输出值
 * @returns 误差对输出的梯度
 */
const computeOutputLayerGradients = (target: number[], output: number[]): Float64Array => {
    return Float64Array.from(output.map((o, i) => o - target[i])); // 误差函数的导数
}

/**
 * 反向传播算法
 * @param mlp 多层感知机
 * @param target 目标输出
 */
export const 反向传播 = (mlp: MLP, target: number[]) => {

    const outputLayer = mlp[mlp.length - 1]; // 获取输出层
    const output = outputLayer.map(neuron => neuron.output); // 获取每个神经元的输出
    const outputGradients = computeOutputLayerGradients(target, output); // 计算输出层的梯度

    // 计算输出层每个神经元的梯度
    outputLayer.forEach((neuron, i) => {
        neuron.d_b_arr.push(outputGradients[i]);
        neuron.d_w_arr.push(new Float64Array(neuron.w.length).fill(outputGradients[i]));
    });

    // 从输出层开始反向传播
    for (let layerIndex = mlp.length - 2; layerIndex >= 0; layerIndex--) {
        const currentLayer = mlp[layerIndex];
        const nextLayer = mlp[layerIndex + 1];

        currentLayer.forEach((neuron, i) => {
            const nextLayerWeights = nextLayer.map(nextNeuron => nextNeuron.w[i]);
            const nextLayerGradients = nextLayer.reduce((acc, nextNeuron, j) => {
                return acc + nextNeuron.d_b_arr.reduce((sum, d_b) => sum + d_b * nextLayerWeights[j], 0);
            }, 0);

            neuron.d_b_arr.push(nextLayerGradients);
            neuron.d_w_arr.push(new Float64Array(neuron.w.length).fill(nextLayerGradients));
        });
    }

}
