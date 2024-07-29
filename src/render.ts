import * as d3 from 'd3';
import { MLP } from './T';

// 配置对象
const config = {
    inputSize: 28,             // 输入层的大小为 28x28
    hiddenLayers: [10, 10, 10], // 3 个隐藏层，每层 10 个神经元
    outputSize: 10,            // 输出层有 10 个神经元
    neuronWidth: 20,           // 神经元矩形宽度
    neuronHeight: 20,          // 神经元矩形高度
    layerSpacing: 200,         // 层之间的水平间距
    neuronSpacing: 16,         // 神经元之间的垂直间距
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

const inputNeurons: { x: number, y: number, setColor: (color: string) => void }[] = [];

for (let i = 0; i < config.inputSize * config.inputSize; i++) {
    const xIndex = i % 28
    const yIndex = Math.floor(i / 28)
    const x = inputLayerX + xIndex * config.neuronWidth;
    const y = inputLayerY + yIndex * config.neuronHeight;
    inputNeurons[i] = ({ x, y, setColor: () => { } });
}

// 绘制隐藏层
let prevLayerX = inputLayerX + config.inputSize * config.neuronWidth + config.layerSpacing * 1.5;
const hiddenLayerY = (height - Math.max(...config.hiddenLayers) * config.neuronHeight) / 2;

const hiddenLayers: { x: number, y: number, setColor: (color: string) => void }[][] = [];
config.hiddenLayers.forEach((layerSize, layerIndex) => {
    const layerX = prevLayerX;
    const layerY = hiddenLayerY;

    hiddenLayers.push([]);

    for (let i = 0; i < layerSize; i++) {
        const x = layerX;
        const y = layerY + i * (config.neuronHeight + config.neuronSpacing);

        const xx = svg.append('rect')
            .attr('x', x)
            .attr('y', y)
            .attr('width', config.neuronWidth)
            .attr('height', config.neuronHeight)
            .attr('stroke', 'black')
            .attr('fill', config.hiddenLayerColor);

        hiddenLayers[layerIndex].push({ x, y, setColor: color => xx.attr('fill', color) });
    }

    prevLayerX += config.neuronWidth + config.layerSpacing;
});

// 绘制输出层
const outputLayerX = prevLayerX + config.layerSpacing;
const outputLayerY = (height - config.outputSize * config.neuronHeight) / 2;

const outputNeurons: { x: number, y: number, setColor: (color: string) => void }[] = [];

for (let i = 0; i < config.outputSize; i++) {
    const x = outputLayerX;
    const y = outputLayerY + i * (config.neuronHeight + config.neuronSpacing);

    const xx = svg.append('rect')
        .attr('x', x)
        .attr('y', y)
        .attr('width', config.neuronWidth)
        .attr('height', config.neuronHeight)
        .attr('stroke', 'black')
        .attr('fill', config.outputLayerColor);

    outputNeurons.push({ x, y, setColor: color => xx.attr('fill', color) });
}

// 绘制输入层到隐藏层的连接线
inputNeurons.forEach(inputNeuron => {
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



inputNeurons.forEach(v => {
    const xx = svg.append('rect')
        .attr('x', v.x)
        .attr('y', v.y)
        .attr('width', config.neuronWidth)
        .attr('height', config.neuronHeight)
        .attr('stroke', 'black')
        .attr('fill', config.inputLayerColor);

    v.setColor = color => {
        xx.attr('fill', color);
    }
})


export const render = (mlp: MLP) => {
    const adjust = (value: number, gray: number) => Math.round(value * gray + (255 - gray * 255))

    const adjustColorBrightness = (gray: number): string => {
        const adjustedR = adjust(0xcc, gray)
        const adjustedG = adjust(0x66, gray)
        const adjustedB = adjust(0xff, gray)
        return `rgb(${adjustedR}, ${adjustedG}, ${adjustedB})`
    }

    mlp.layers[0].neurons.forEach((v, i) => {
        inputNeurons[i].setColor(adjustColorBrightness(v.output))
    })

    for (let i = 1; i < mlp.layers.length - 1; i++) {
        mlp.layers[i].neurons.forEach((v, j) => {
            hiddenLayers[i - 1][j].setColor(adjustColorBrightness(v.output))
        })
    }


    mlp.layers[mlp.layers.length - 1].neurons.forEach((v, i) => {
        outputNeurons[i].setColor(adjustColorBrightness(v.output))
    })

}