export class PreviewWindowUi {
	private canvas_: HTMLCanvasElement;
	private canvas_frame_: HTMLDivElement;
	private scale_selector_: HTMLSelectElement;
	private command_frame_: HTMLDivElement;
	private holder_: HTMLDivElement;
	constructor(width: number, height: number) {
		this.canvas_ = document.createElement("canvas");
		this.canvas_.width = width;
		this.canvas_.height = height;
		this.canvas_.style.margin = "auto";
		this.canvas_frame_ = document.createElement("div");
		this.canvas_frame_.style.display = "flex";
		this.canvas_frame_.appendChild(this.canvas_);
		this.scale_selector_ = document.createElement("select");
		const scale_array = [1, 2, 3, 4, 6, 8, 12, 16, 24];
		for (let scale of scale_array) {
			const scale_option = document.createElement("option")
			scale_option.value = scale.toString();
			scale_option.innerText = `x${scale}`;
			this.scale_selector_.appendChild(scale_option);
		}
		this.command_frame_ = document.createElement("div");
		this.command_frame_.style.textAlign = "right";
		this.command_frame_.innerText = "表示倍率";
		this.command_frame_.appendChild(this.scale_selector_);

		this.holder_ = document.createElement("div");
		this.holder_.appendChild(this.command_frame_);
		this.holder_.appendChild(this.canvas_frame_);
	}
	public get node(): HTMLDivElement {
		return this.holder_;
	}
	public Draw(pixels: number[][], color_table: string[], width: number, height: number) {
		const view_scale = parseInt(this.scale_selector_.value);
		if (this.canvas_.width !== width * view_scale) {
			this.canvas_.width = width * view_scale;
		}
		if (this.canvas_.height !== height * view_scale) {
			this.canvas_.height = height * view_scale;
		}
		const context = this.canvas_.getContext("2d");
		context.imageSmoothingEnabled = false;
		context.setTransform(1, 0, 0, 1, 0, 0);
		context.scale(view_scale, view_scale);
		for (let h = 0; h < height; h++) {
			for (let w = 0; w < width; w++) {
				const color_index = pixels[h][w];
				context.fillStyle = color_table[color_index];
				context.fillRect(w, h, 1, 1);
			}
		}
	}
}
