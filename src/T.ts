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

// 反向传播函数  target是实际需要的输出


const set_dw = (mlp: MLP, layerIndex: number, neuronIndex: number, X: number) => {
    const current = mlp[layerIndex][neuronIndex]
    for (let i = 0; i < current.w.length; i++) {
        const prev = mlp[layerIndex - 1][i]
        current.d_w[i] = X * (1 - current.output) * prev.output
    }
}

export const 反向传播 = (mlp: MLP, target: number[]) => {

    target.forEach((y, i) => {
        const neuron = mlp[mlp.length - 1][i]
        const X = (neuron.output - y) * neuron.output
        set_dw(mlp, mlp.length - 1, i, X)

        //
        const XX = neuron.d_w[i] * neuron.w[i]
        for (let li = mlp.length - 2; li >= 1; li--) {
            const test = mlp[li]
            for (let i = 0; i < test.length; i++) {
                set_dw(mlp, mlp.length - 2, i, XX)
            }
        }
    })
}





//output已经计算好输出值了
//链式求导
//激活函数是sigmoid
//计算输出层的 d_w 和 d_b
//计算隐藏层的 d_w 和 d_b
//中文注释 

// 反向传播函数  target是实际需要的输出