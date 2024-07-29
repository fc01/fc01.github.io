export type Neuron = {
    w: Float64Array
    b: number
    d_w: Float64Array
    d_b: number
    output: number //输出缓存
}
export type Layer = Neuron[]
export type MLP = Layer[] //第1层是 输入层 output直接有数据 最后一层是输出层

const clear_w_b = (mlp: MLP) =>
    mlp.forEach(layer => layer.forEach(neuron => {
        neuron.d_w = neuron.d_w.map(() => 0)
        neuron.d_b = 0
    }))

const update_w_b = (mlp: MLP) =>
    mlp.forEach(layer => layer.forEach(neuron => {
        neuron.w = neuron.w.map((vv, i) => vv - neuron.d_w[i] * 0.001)
        neuron.b = neuron.b - neuron.d_b * 0.001
    }))


//output已经计算好输出值了
//clear_w_b 和  update_w_b 中间 实现更新 d_w d_b 代码
//误差函数 是 (target-output)的平方/2
//链式求导
//中文注释
export const 反向传播 = (mlp: MLP, target: number[]) => {
    clear_w_b(mlp); // 清除所有神经元的梯度

    // 1. 计算输出层的梯度
    const outputLayer = mlp[mlp.length - 1]; // 获取输出层
    const previousLayer = mlp[mlp.length - 2]; // 获取前一层（隐藏层）

    // 计算每个输出神经元的误差
    const errors = outputLayer.map((neuron, index) => neuron.output - target[index]);

    // 更新输出层神经元的梯度
    outputLayer.forEach((neuron, j) => {
        // 计算输出层偏置的梯度
        neuron.d_b = errors[j];

        // 计算输出层权重的梯度
        neuron.d_w = neuron.w.map((_, k) => errors[j] * (previousLayer[k]?.output || 0));
    });

    // 2. 反向传播误差到隐藏层
    for (let i = mlp.length - 2; i >= 0; i--) {
        const currentLayer = mlp[i]; // 当前层
        const nextLayer = mlp[i + 1]; // 下一层

        currentLayer.forEach((neuron, j) => {
            // 计算当前层的偏置梯度
            neuron.d_b = nextLayer.reduce((sum, nextNeuron, k) => {
                // 使用链式法则计算当前神经元的偏置梯度
                return sum + nextNeuron.d_w[j] * (nextNeuron.output - target[k]);
            }, 0);

            // 计算当前层的权重梯度
            neuron.d_w = neuron.w.map((_, k) => neuron.d_b * (mlp[i - 1]?.[k]?.output || 0));
        });
    }

    update_w_b(mlp); // 使用计算的梯度更新权重和偏置
}

