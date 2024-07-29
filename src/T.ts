export type Neuron = {
    w: Float64Array
    d_w: Float64Array
    b: number
    output: number
}
export type Layer = Neuron[]
export type MLP = Layer[]