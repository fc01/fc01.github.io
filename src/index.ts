import * as d3 from 'd3';
import { data } from './data';

// 配置对象
const config = {
    inputSize: 28,             // 输入层的大小为 28x28
    hiddenLayers: [10, 10, 10], // 3 个隐藏层，每层 10 个神经元
    outputSize: 10,            // 输出层有 10 个神经元
    neuronWidth: 20,           // 神经元矩形宽度
    neuronHeight: 20,          // 神经元矩形高度
    layerSpacing: 100,         // 层之间的水平间距
    neuronSpacing: 8,         // 神经元之间的垂直间距
    inputLayerColor: '#ff9999', // 输入层神经元颜色
    hiddenLayerColor: '#99ff99', // 隐藏层神经元颜色
    outputLayerColor: '#9999ff' // 输出层神经元颜色
};

const width = 3000; // SVG 的宽度
const height = 1000; // SVG 的高度

// 创建 SVG 画布
const svg = d3.select('body').append('svg')
    .attr('width', width)
    .attr('height', height);

// 绘制输入层
const inputLayerX = 20
const inputLayerY = 20

const inputNeurons: { x: number, y: number, setColor: (color: string) => void }[][] = [];
for (let i = 0; i < config.inputSize; i++) {
    inputNeurons[i] = [];
    for (let j = 0; j < config.inputSize; j++) {
        const x = inputLayerX + j * config.neuronWidth;
        const y = inputLayerY + i * config.neuronHeight;
        inputNeurons[i].push({ x, y, setColor: () => { } });
    }
}



// 绘制隐藏层
let prevLayerX = inputLayerX + config.inputSize * config.neuronWidth + config.layerSpacing * 3;
const hiddenLayerY = (height - Math.max(...config.hiddenLayers) * config.neuronHeight) / 2;

const hiddenLayers: { x: number, y: number }[][] = [];
config.hiddenLayers.forEach((layerSize, layerIndex) => {
    const layerX = prevLayerX;
    const layerY = hiddenLayerY;

    hiddenLayers.push([]);

    for (let i = 0; i < layerSize; i++) {
        const x = layerX;
        const y = layerY + i * (config.neuronHeight + config.neuronSpacing);

        svg.append('rect')
            .attr('x', x)
            .attr('y', y)
            .attr('width', config.neuronWidth)
            .attr('height', config.neuronHeight)
            .attr('stroke', 'black')
            .attr('fill', config.hiddenLayerColor);

        hiddenLayers[layerIndex].push({ x, y });
    }

    prevLayerX += config.neuronWidth + config.layerSpacing;
});

// 绘制输出层
const outputLayerX = prevLayerX + config.layerSpacing;
const outputLayerY = (height - config.outputSize * config.neuronHeight) / 2;

const outputNeurons: { x: number, y: number }[] = [];

for (let i = 0; i < config.outputSize; i++) {
    const x = outputLayerX;
    const y = outputLayerY + i * (config.neuronHeight + config.neuronSpacing);

    svg.append('rect')
        .attr('x', x)
        .attr('y', y)
        .attr('width', config.neuronWidth)
        .attr('height', config.neuronHeight)
        .attr('stroke', 'black')
        .attr('fill', config.outputLayerColor);

    outputNeurons.push({ x, y });
}

// 绘制输入层到隐藏层的连接线
inputNeurons.forEach(row => {
    row.forEach(inputNeuron => {
        [hiddenLayers[0]].forEach(layer => {
            layer.forEach(hiddenNeuron => {
                svg.append('line')
                    .attr('x1', inputNeuron.x + config.neuronWidth / 2)
                    .attr('y1', inputNeuron.y + config.neuronHeight / 2)
                    .attr('x2', hiddenNeuron.x)
                    .attr('y2', hiddenNeuron.y + config.neuronHeight / 2)
                    .attr('stroke', 'black')
                    .attr('stroke-width', 1);
            });
        });
    });
});

// 绘制隐藏层之间的连接线
for (let l = 0; l < hiddenLayers.length - 1; l++) {
    hiddenLayers[l].forEach(neuron1 => {
        hiddenLayers[l + 1].forEach(neuron2 => {
            svg.append('line')
                .attr('x1', neuron1.x + config.neuronWidth)
                .attr('y1', neuron1.y + config.neuronHeight / 2)
                .attr('x2', neuron2.x)
                .attr('y2', neuron2.y + config.neuronHeight / 2)
                .attr('stroke', 'black')
                .attr('stroke-width', 1);
        });
    });
}

// 绘制隐藏层到输出层的连接线
hiddenLayers[hiddenLayers.length - 1].forEach(hiddenNeuron => {
    outputNeurons.forEach(outputNeuron => {
        svg.append('line')
            .attr('x1', hiddenNeuron.x + config.neuronWidth)
            .attr('y1', hiddenNeuron.y + config.neuronHeight / 2)
            .attr('x2', outputNeuron.x)
            .attr('y2', outputNeuron.y + config.neuronHeight / 2)
            .attr('stroke', 'black')
            .attr('stroke-width', 1);
    });
})



for (let i = 0; i < config.inputSize; i++) {
    for (let j = 0; j < config.inputSize; j++) {
        const x = svg.append('rect')
            .attr('x', inputNeurons[i][j].x)
            .attr('y', inputNeurons[i][j].y)
            .attr('width', config.neuronWidth)
            .attr('height', config.neuronHeight)
            .attr('stroke', 'black')
            .attr('fill', config.inputLayerColor);

        inputNeurons[i][j].setColor = color => {
            x.attr('fill', color);
        }
    }
}
 
data.training[0].input.forEach((v, i) => {
    inputNeurons[Math.floor(i / 28)][i % 28].setColor(v > 0 ? '#cc66ff' : '#ffffff')
})
