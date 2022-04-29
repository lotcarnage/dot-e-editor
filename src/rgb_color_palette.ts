export class RgbColor {
    r: number;
    g: number;
    b: number;
    public constructor(r = 0, g = 0, b = 0) {
        this.r = r;
        this.g = g;
        this.b = b;
    }
    public ToHexColor(): string {
        const r_hex = ('00' + this.r.toString(16)).slice(-2);
        const g_hex = ('00' + this.g.toString(16)).slice(-2);
        const b_hex = ('00' + this.b.toString(16)).slice(-2);
        return `#${r_hex}${g_hex}${b_hex}`;
    }
    public ToRgbString(): string {
        return `rgb(${this.r},${this.g},${this.b})`;
    }
    public SetHexColor(hex_color: string): boolean {
        const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex_color);
        if (result) {
            this.r = parseInt(result[1], 16);
            this.g = parseInt(result[2], 16);
            this.b = parseInt(result[3], 16);
        }
        return !!(result);
    }
    public SetRgbString(rgb_string: string): boolean {
        const result = /^rgb\s*\(\s*([\d]+)\s*,\s*([\d]+)\s*,\s*([\d]+)\s*\)/i.exec(rgb_string);
        if (result) {
            this.r = Number(result[1]);
            this.g = Number(result[2]);
            this.b = Number(result[3]);
        }
        return !!(result);
    }
    public SetColorString(color_string: string): boolean {
        return this.SetHexColor(color_string) ? true : this.SetRgbString(color_string);
    }
}

export class RgbColorPalette {
    colors_ = new Array<RgbColor>(256);
    constructor() {
        for (let i = 0; i < 256; i++) {
            this.colors_[i] = new RgbColor();
        }
    }

    SetPresetColor(index: number, preset_color: "black" | "white") {
        if (preset_color == "black") {
            this.colors_[index].r = 0;
            this.colors_[index].g = 0;
            this.colors_[index].b = 0;
        }
    }
    SetColor(index: number, color: RgbColor) {
        this.colors_[index].r = color.r;
        this.colors_[index].g = color.g;
        this.colors_[index].b = color.b;
    }
    SetColorByString(index: number, color: string) {
        this.colors_[index].SetRgbString(color);
    }
    GetColor(index: number): RgbColor {
        return this.colors_[index];
    }
    SwapColor(index_a: number, index_b: number) {
        const tmp_color = this.colors_[index_a];
        this.colors_[index_a] = this.colors_[index_b];
        this.colors_[index_b] = tmp_color;
    }

}