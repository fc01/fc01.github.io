export type Neuron = {
    w: Float64Array
    b: number
    d_w: Float64Array
    d_b: number
    output: number // 输出缓存

    d_w_废弃_不用_arr: Float64Array[]
    d_b_废弃_不用_arr: number[]
}
export type Layer = Neuron[]
export type MLP = Layer[] // 第1层是输入层 output直接有数据 最后一层是输出层

// Sigmoid function
const sigmoid = (x: number): number => {
    return 1 / (1 + Math.exp(-x));
}

// Derivative of the sigmoid function
const sigmoidDerivative = (output: number): number => {
    return output * (1 - output);
}

// Helper function to set d_w for a given neuron in a given layer
const set_dw = (mlp: MLP, layerIndex: number, neuronIndex: number, X: number) => {
    const current = mlp[layerIndex][neuronIndex]
    for (let i = 0; i < current.w.length; i++) {
        const prev = mlp[layerIndex - 1][i]
        current.d_w[i] = X * sigmoidDerivative(current.output) * prev.output
    }
}

// 反向传播函数  target是实际需要的输出
export const 反向传播 = (mlp: MLP, target: number[]) => {
    // Output layer gradients
    target.forEach((y, i) => {
        const neuron = mlp[mlp.length - 1][i]
        const error = neuron.output - y
        const delta = error * sigmoidDerivative(neuron.output)
        neuron.d_b = delta

        for (let j = 0; j < neuron.w.length; j++) {
            neuron.d_w[j] = delta * mlp[mlp.length - 2][j].output
        }
    })

    // Hidden layer gradients
    for (let li = mlp.length - 2; li > 0; li--) {
        const layer = mlp[li]
        const nextLayer = mlp[li + 1]

        for (let ni = 0; ni < layer.length; ni++) {
            const neuron = layer[ni]
            let error = 0
            for (let nextNeuron of nextLayer) {
                error += nextNeuron.d_b * nextNeuron.w[ni]
            }

            const delta = error * sigmoidDerivative(neuron.output)
            neuron.d_b = delta

            for (let j = 0; j < neuron.w.length; j++) {
                neuron.d_w[j] = delta * mlp[li - 1][j].output
            }
        }
    }
}

// 输入层 i1 i2
// 隐藏层 h1 h2
// 隐藏层 H1 H2
// 输出层 o1 o2

// w 用前一层和这一层名字表示 比如 w_h1_H1 
// b 用这一层名字表示 比如 b_H1 
// w_i1_h1 链式求导 完整公式






//output已经计算好输出值了
//链式求导  
//反向传播函数 有bug 改一下
//只需要返回 反向传播 函数