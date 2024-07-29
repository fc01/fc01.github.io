export type FloatArray = ArrayLike<number>

export type Neuron = {
    w: FloatArray
    d_w: FloatArray
    b: number
    // output: number
}

export type Layer = {
    input: FloatArray
    output: FloatArray
    neurons: Neuron[]
}

export type MLP = {
    input: FloatArray
    layers: Layer[]
}