export type Neuron = {
    w: number[]
    b: number

    //
    d_w: number[]
    output: number
}

export type Layer = {
    neurons: Neuron[]
}

export type MLP = {
    layers: Layer[]
}