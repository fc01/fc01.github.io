export type Neuron = {
    w: Float64Array
    b: number
    d_w: Float64Array
    d_b: number
    output: number //输出缓存

    d_w_废弃_不用_arr: Float64Array[]
    d_b_废弃_不用_arr: number[]
}
export type Layer = Neuron[]
export type MLP = Layer[] //第1层是 输入层 output直接有数据 最后一层是输出层




//output已经计算好输出值了
//链式求导
//计算输出层的 d_w 和 d_b
//计算隐藏层的 d_w 和 d_b
//中文注释 

// 反向传播函数  target是实际需要的输出

export const 反向传播 = (mlp: MLP, target: number[]) => {
    // 计算输出层的 d_w 和 d_b
    const outputLayer = mlp[mlp.length - 1];
    
    for (let i = 0; i < outputLayer.length; i++) {
        const neuron = outputLayer[i];
        // 计算输出层误差
        const error = target[i] - neuron.output;
        // 计算输出层的 d_b
        neuron.d_b = error;
        // 计算输出层的 d_w
        neuron.d_w = neuron.w.map((w, index) => error * neuron.output); // 假设激活函数为线性函数
    }

    // 计算隐藏层的 d_w 和 d_b
    for (let l = mlp.length - 2; l > 0; l--) {
        const layer = mlp[l];
        const nextLayer = mlp[l + 1];

        for (let i = 0; i < layer.length; i++) {
            const neuron = layer[i];
            // 初始化 d_b 和 d_w
            neuron.d_b = 0;
            neuron.d_w = new Float64Array(neuron.w.length);

            // 计算每个神经元的误差
            for (let j = 0; j < nextLayer.length; j++) {
                const nextNeuron = nextLayer[j];
                const error = nextNeuron.d_b * nextNeuron.w[i];
                neuron.d_b += error;
                neuron.d_w = neuron.d_w.map((val, index) => val + error * neuron.output);
            }
        }
    }
}
