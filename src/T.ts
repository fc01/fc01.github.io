export type Neuron = {
    w: Float64Array
    d_w: Float64Array
    b: number
    output: number
}

export type Layer = {
    neurons: Neuron[]
}

export type MLP = {
    layers: Layer[]
}