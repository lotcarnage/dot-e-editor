namespace UiParts {
	const CreateLeftBox = function (): HTMLDivElement {
		const div = document.createElement("div");
		div.style.float = "left";
		return div;
	}
	const CreateRightBox = function (): HTMLDivElement {
		const div = document.createElement("div");
		div.style.float = "right";
		return div;
	}
	const CreateText = function (text: string): HTMLSpanElement {
		const span = document.createElement("span");
		span.innerText = text;
		return span;
	}

	export class SpriteAnimationPreviewWindowUi {
		private sprite_width_: HTMLInputElement;
		private sprite_height_: HTMLInputElement;
		private size_frame_: HTMLDivElement;
		private animation_step_par_frame_: HTMLInputElement;
		private scale_selector_: HTMLSelectElement;
		private scale_selector_holder_: HTMLDivElement;
		private command_frame_: HTMLDivElement;
		private canvas_: HTMLCanvasElement;
		private canvas_frame_: HTMLDivElement;
		private animation_playback_button_: HTMLButtonElement;
		private sprite_indices_: HTMLTextAreaElement;
		private settings_frame_: HTMLDivElement;
		private is_playing_: boolean;
		private sprite_animation_indices_: number[];
		private holder_: HTMLDivElement;
		constructor(width: number, height: number) {
			this.sprite_width_ = document.createElement("input");
			this.sprite_height_ = document.createElement("input");
			this.sprite_width_.type = "number";
			this.sprite_height_.type = "number";
			this.sprite_width_.min = "1";
			this.sprite_height_.min = "1";
			this.sprite_width_.value = width.toString();
			this.sprite_height_.value = height.toString();

			this.scale_selector_ = document.createElement("select");
			const scale_array = [1, 2, 3, 4, 6, 8, 12, 16, 24];
			for (let scale of scale_array) {
				const scale_option = document.createElement("option")
				scale_option.value = scale.toString();
				scale_option.innerText = `x${scale}`;
				this.scale_selector_.appendChild(scale_option);
			}
			this.scale_selector_holder_ = CreateRightBox();
			this.scale_selector_holder_.appendChild(CreateText("表示倍率"));
			this.scale_selector_holder_.appendChild(this.scale_selector_);

			this.size_frame_ = document.createElement("div");
			this.size_frame_.appendChild(CreateText("サイズ"));
			this.size_frame_.appendChild(this.sprite_width_);
			this.size_frame_.appendChild(CreateText("x"));
			this.size_frame_.appendChild(this.sprite_height_);
			this.size_frame_.appendChild(this.scale_selector_holder_);

			this.animation_step_par_frame_ = document.createElement("input");
			this.animation_step_par_frame_.type = "number";
			this.animation_step_par_frame_.min = "1";
			this.animation_step_par_frame_.value = "1";

			this.animation_playback_button_ = document.createElement("button");
			this.animation_playback_button_.innerText = "▶︎";
			this.is_playing_ = false;
			this.animation_playback_button_.addEventListener('click', (event) => {
				const button = (<HTMLButtonElement>event.target);
				button.innerText = this.is_playing_ === true ? "▶︎" : "■";
				this.is_playing_ = !this.is_playing_;
			});

			this.command_frame_ = document.createElement("div");
			this.command_frame_.appendChild(this.animation_step_par_frame_);
			this.command_frame_.appendChild(CreateText("/１コマ"));
			this.command_frame_.appendChild(this.animation_playback_button_);

			this.canvas_ = document.createElement("canvas");
			this.canvas_.width = width;
			this.canvas_.height = height;
			this.canvas_.style.margin = "auto";
			this.canvas_frame_ = document.createElement("div");
			this.canvas_frame_.style.display = "flex";
			this.canvas_frame_.appendChild(this.canvas_);

			this.sprite_animation_indices_ = new Array<number>(0);
			this.sprite_indices_ = document.createElement("textarea");
			this.sprite_indices_.style.height = "1.4em";
			this.sprite_indices_.innerText = "0";
			this.settings_frame_ = document.createElement("div");
			this.settings_frame_.appendChild(this.sprite_indices_);

			this.holder_ = document.createElement("div");
			this.holder_.appendChild(this.size_frame_);
			this.holder_.appendChild(this.command_frame_);
			this.holder_.appendChild(this.canvas_frame_);
			this.holder_.appendChild(this.settings_frame_);
		}
		private UpdateSpriteIndicesArray() {
			const index_strings = this.sprite_indices_.value.split(',');
			this.sprite_animation_indices_.length = 0;
			for (let index_string of index_strings) {
				const parsed = parseInt(index_string);
				if (!isNaN(parsed)) {
					this.sprite_animation_indices_.push(parsed);
				}
			}
		}
		public get node(): HTMLDivElement {
			return this.holder_;
		}
		public Draw(pixels: number[][], color_table: string[], width: number, height: number, frame_count: number) {
			if (!this.is_playing_) {
				return;
			}
			this.UpdateSpriteIndicesArray();
			const num_indeices = this.sprite_animation_indices_.length;
			if (0 === num_indeices) {
				return;
			}
			const step_par_frame = Math.max(1, this.animation_step_par_frame_.valueAsNumber);
			const frame_number = Math.floor(frame_count / step_par_frame) % num_indeices;
			const sprite_index = this.sprite_animation_indices_[frame_number];
			const sprite_w = Math.max(1, Math.min(width, this.sprite_width_.valueAsNumber));
			const sprite_h = Math.max(1, Math.min(height, this.sprite_height_.valueAsNumber));
			const sprite_count_in_w = Math.floor(width / sprite_w);
			const sprite_count_in_h = Math.floor(height / sprite_h);
			const max_sprite_index = sprite_count_in_w * sprite_count_in_h;
			if (max_sprite_index <= sprite_index) {
				return;
			}
			const pixel_w_offset = Math.floor(sprite_index % sprite_count_in_w) * sprite_w;
			const pixel_h_offset = Math.floor(sprite_index / sprite_count_in_w) * sprite_h;
			const max_w = Math.min(pixel_w_offset + sprite_w, width);
			const max_h = Math.min(pixel_h_offset + sprite_h, height);
			const view_scale = parseInt(this.scale_selector_.value);

			if (this.canvas_.width !== sprite_w * view_scale) {
				this.canvas_.width = sprite_w * view_scale;
			}
			if (this.canvas_.height !== sprite_h * view_scale) {
				this.canvas_.height = sprite_h * view_scale;
			}
			const context = this.canvas_.getContext('2d');
			context.imageSmoothingEnabled = false;
			context.setTransform(1, 0, 0, 1, 0, 0);
			context.scale(view_scale, view_scale);
			for (let h = pixel_h_offset; h < max_h; h++) {
				for (let w = pixel_w_offset; w < max_w; w++) {
					const color_index = pixels[h][w];
					context.fillStyle = color_table[color_index];
					context.fillRect(w - pixel_w_offset, h - pixel_h_offset, 1, 1);
				}
			}
			return;
		}
	}
}
