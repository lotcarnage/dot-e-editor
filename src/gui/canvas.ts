namespace UiParts {
	type Rectangle = { left: number, top: number; right: number; bottom: number };
	type ResizeCanvasCallback = (width: number, height: number) => void;
	export class CanvasUi {
		private canvas_width_spin_: HTMLInputElement;
		private canvas_height_spin_: HTMLInputElement;
		private small_grid_view_: HTMLInputElement;
		private small_grid_label_: HTMLLabelElement;
		private large_grid_view_: HTMLInputElement;
		private large_grid_label_: HTMLLabelElement;
		private color_index_view_: HTMLInputElement;
		private color_index_label_: HTMLLabelElement;
		private scale_selector_: HTMLSelectElement;
		private settings_holder_: HTMLDivElement;
		private last_width_: number;
		private last_height_: number;
		private last_scale_: number;
		private last_small_grid_view_: boolean;
		private last_large_grid_view_: boolean;
		private last_color_index_view_: boolean;
		private last_large_grid_width_: number;
		private last_large_grid_height_: number;
		private last_small_grid_color_: string;
		private last_pixels_: number[][];
		private last_pixel_mask_: boolean[][];
		private last_colors_: string[];
		private last_selected_rectangle_area_: Rectangle | null;
		private canvas_: HTMLCanvasElement;
		private canvas_box_: HTMLDivElement;
		private canvas_frame_: HTMLDivElement;
		private holder_: HTMLDivElement;
		private resize_cb_: ResizeCanvasCallback;
		private static count_: number = 0;
		private static CreateNumberInput(minimum: number, maximum: number): HTMLInputElement {
			const element = document.createElement("input");
			element.type = "number";
			element.min = minimum.toString();
			element.max = maximum.toString();
			return element;
		}
		private static CreateCheckBox(checkbox_id: string, label_content: HTMLElement): [HTMLInputElement, HTMLLabelElement] {
			const checkbox = document.createElement("input");
			checkbox.type = "checkbox";
			checkbox.id = checkbox_id;
			const label = document.createElement("label");
			label.htmlFor = checkbox.id;
			label.appendChild(label_content);
			return [checkbox, label];
		}
		private static DrawLine(canvas_context: CanvasRenderingContext2D, start_x: number, start_y: number, end_x: number, end_y: number) {
			canvas_context.moveTo(start_x, start_y);
			canvas_context.lineTo(end_x, end_y);
			return;
		}
		private static CreateSmallGridIcon(icon_size: number) {
			const icon = document.createElement("canvas");
			icon.width = icon_size;
			icon.height = icon_size;
			const icon_context = icon.getContext("2d");
			icon_context.fillStyle = "#101010";
			icon_context.fillRect(0, 0, icon_size, icon_size);
			icon_context.beginPath();
			icon_context.lineWidth = 1;
			icon_context.strokeStyle = "#909090";
			for (let i = -0.5; i < icon_size; i += 4) {
				CanvasUi.DrawLine(icon_context, i, 0, i, icon_size);
				CanvasUi.DrawLine(icon_context, 0, i, icon_size, i);
			}
			icon_context.stroke();
			return icon;
		}
		private static CreateLargeGridIcon(icon_size: number) {
			const icon = CanvasUi.CreateSmallGridIcon(icon_size);
			const icon_context = icon.getContext("2d");
			icon_context.beginPath();
			icon_context.lineWidth = 1;
			icon_context.strokeStyle = "#ffff00";
			for (let i = -0.5; i < icon_size; i += 8) {
				CanvasUi.DrawLine(icon_context, i, 0, i, icon_size);
				CanvasUi.DrawLine(icon_context, 0, i, icon_size, i);
			}
			icon_context.stroke();
			return icon;
		}
		private static CreateText(text: string): HTMLSpanElement {
			const span = document.createElement("span");
			span.innerText = text;
			return span;
		}

		constructor(width: number, height: number, resize_cb: ResizeCanvasCallback) {
			/* for Canvas Size */
			this.canvas_width_spin_ = CanvasUi.CreateNumberInput(1, 512);
			this.canvas_height_spin_ = CanvasUi.CreateNumberInput(1, 512);
			this.canvas_width_spin_.value = width.toString();
			this.canvas_height_spin_.value = height.toString();
			/* 最初の描画のために必ず差分が発生するように初期化しておく */
			this.last_width_ = 0;
			this.last_height_ = 0;

			/* view grid checkbox */
			[this.small_grid_view_, this.small_grid_label_] = CanvasUi.CreateCheckBox(`canvasui_sg_${CanvasUi.count_}`, CanvasUi.CreateSmallGridIcon(24));
			[this.large_grid_view_, this.large_grid_label_] = CanvasUi.CreateCheckBox(`canvasui_lg_${CanvasUi.count_}`, CanvasUi.CreateLargeGridIcon(24));
			[this.color_index_view_, this.color_index_label_] = CanvasUi.CreateCheckBox(`canvasui_ci_${CanvasUi.count_}`, CanvasUi.CreateText("色番号"));
			this.last_small_grid_view_ = false;
			this.last_large_grid_view_ = false;
			this.last_color_index_view_ = false;
			this.last_large_grid_width_ = 0;
			this.last_large_grid_height_ = 0;
			this.last_small_grid_color_ = '#000000';

			/* for Scale selector */
			this.scale_selector_ = document.createElement("select");
			const scales = [1, 2, 4, 8, 12, 16, 20, 24, 28, 32];
			for (let i = 0; i < scales.length; i++) {
				const preset_option = document.createElement("option");
				preset_option.value = scales[i].toString();
				preset_option.innerText = `x${scales[i]}`;
				this.scale_selector_.append(preset_option);
			}
			this.scale_selector_.selectedIndex = 0;
			this.last_scale_ = 1;

			/* settings holder */
			this.settings_holder_ = document.createElement("div");
			this.settings_holder_.appendChild(this.canvas_width_spin_);
			this.settings_holder_.appendChild(this.canvas_height_spin_);
			this.settings_holder_.appendChild(this.small_grid_view_);
			this.settings_holder_.appendChild(this.small_grid_label_);
			this.settings_holder_.appendChild(this.large_grid_view_);
			this.settings_holder_.appendChild(this.large_grid_label_);
			this.settings_holder_.appendChild(this.color_index_view_);
			this.settings_holder_.appendChild(this.color_index_label_);
			this.settings_holder_.appendChild(this.scale_selector_);
			this.settings_holder_.style.backgroundColor = "gray";
			this.settings_holder_.style.display = "flex";
			this.settings_holder_.style.padding = "2px 0px 2px 2px";

			/* for Canvas */
			this.canvas_ = document.createElement("canvas");
			this.canvas_.width = width;
			this.canvas_.height = height;
			this.canvas_.addEventListener("contextmenu", (event) => {
				event.preventDefault();
				return false;
			});
			this.canvas_box_ = document.createElement("div");
			this.canvas_box_.style.width = "max-content";
			this.canvas_box_.style.height = "max-content";
			this.canvas_frame_ = document.createElement("div");
			this.canvas_frame_.style.overflow = "scroll";
			this.canvas_frame_.style.resize = "both";
			this.canvas_frame_.style.clear = "both";
			this.canvas_box_.appendChild(this.canvas_);
			this.canvas_frame_.appendChild(this.canvas_box_);

			this.last_pixels_ = JSON.parse(JSON.stringify((new Array<Array<number>>(512)).fill((new Array<number>(512)).fill(0))));
			this.last_pixel_mask_ = JSON.parse(JSON.stringify((new Array<Array<boolean>>(512)).fill((new Array<boolean>(512)).fill(false))));
			this.last_colors_ = JSON.parse(JSON.stringify(new Array<string>(256).fill('#000000')));
			this.last_selected_rectangle_area_ = null;

			/* compose */
			this.holder_ = document.createElement("div");
			this.holder_.appendChild(this.settings_holder_);
			this.holder_.appendChild(this.canvas_frame_);

			this.resize_cb_ = resize_cb;
			this.canvas_width_spin_.addEventListener("input", (event) => {
				const width = (<HTMLInputElement>event.target).valueAsNumber;
				const height = this.canvas_height_spin_.valueAsNumber;
				if (!isNaN(width) && !isNaN(height)) {
					resize_cb(width, height);
				}
			});
			this.canvas_height_spin_.addEventListener("input", (event) => {
				const height = (<HTMLInputElement>event.target).valueAsNumber;
				const width = this.canvas_width_spin_.valueAsNumber;
				if (!isNaN(width) && !isNaN(height)) {
					resize_cb(width, height);
				}
			});
		}

		public get node(): HTMLDivElement {
			return this.holder_;
		}
		public get canvas(): HTMLCanvasElement {
			return this.canvas_;
		}

		private static PartiallyDrawGrid(
			canvas_context: CanvasRenderingContext2D,
			w_grid_set: Set<number>, h_grid_set: Set<number>,
			width: number, height: number, scale: number, grid_color: string) {
			canvas_context.beginPath();
			const line_height = height;
			const line_width = width;
			const adjust_e = -(1 / scale) / 2;
			for (let w of w_grid_set) {
				const x = (w + 1) + adjust_e;
				CanvasUi.DrawLine(canvas_context, x, -0.5, x, line_height + 0.5);
			}
			for (let h of h_grid_set) {
				const y = (h + 1) + adjust_e;
				CanvasUi.DrawLine(canvas_context, -0.5, y, line_width + 0.5, y);
			}
			canvas_context.lineWidth = 1 / scale;
			canvas_context.strokeStyle = grid_color;
			canvas_context.stroke();
		}
		private static DrawSmallGrid(
			canvas_context: CanvasRenderingContext2D,
			width: number, height: number, scale: number, grid_color: string) {
			const all_w_grid_set = new Set<number>();
			const all_h_grid_set = new Set<number>();
			for (var w = 0; w < width; w++) {
				all_w_grid_set.add(w);
			}
			for (var h = 0; h < height; h++) {
				all_h_grid_set.add(h);
			}
			CanvasUi.PartiallyDrawGrid(canvas_context, all_w_grid_set, all_h_grid_set, width, height, scale, grid_color);
		}

		private static DrawLargeGrid(
			canvas_context: CanvasRenderingContext2D,
			width: number, height: number, scale: number, grid_color: string,
			grid_width: number, grid_height: number) {
			const all_w_grid_set = new Set<number>();
			const all_h_grid_set = new Set<number>();
			const large_grid_width = Math.min(512, Math.max(2, grid_width));
			const large_grid_height = Math.min(512, Math.max(2, grid_height));
			for (var w = large_grid_width; w <= width; w += large_grid_width) {
				all_w_grid_set.add(w - 1);
			}
			for (var h = large_grid_height; h <= height; h += large_grid_height) {
				all_h_grid_set.add(h - 1);
			}
			canvas_context.setLineDash([0.5, 0.5]);
			CanvasUi.PartiallyDrawGrid(canvas_context, all_w_grid_set, all_h_grid_set, width, height, scale, grid_color);
			canvas_context.setLineDash([]);
		}

		private static PartiallyDrawColorIndex(
			canvas_context: CanvasRenderingContext2D,
			pixels: number[][], target_pixel_set: Set<number>,
			width: number, height: number, scale: number, color) {
			const font_size = 8;
			canvas_context.save();
			canvas_context.textAlign = "center";
			canvas_context.textBaseline = "middle";
			canvas_context.font = `8px gothic`;
			canvas_context.fillStyle = color;
			canvas_context.scale(1 / scale, 1 / scale);
			const y_offset = font_size / 2;
			target_pixel_set.forEach((pixel_index) => {
				const w = Math.floor(pixel_index % width);
				const h = Math.floor(pixel_index / width);
				const dst_x = w * scale;
				const dst_y = h * scale;
				const ci = pixels[h][w];
				const x_offset = scale - String(ci).length * (font_size / 2 - 1) - 1;
				canvas_context.fillText(ci.toString(), dst_x + x_offset, dst_y + y_offset);
			});
			canvas_context.restore();
		}

		private static DrawColorIndex(
			canvas_context: CanvasRenderingContext2D,
			pixels: number[][],
			width: number, height: number, scale: number, color: string) {
			const target_pixel_set = new Set<number>();
			for (var h = 0; h < height; h++) {
				for (var w = 0; w < width; w++) {
					target_pixel_set.add(h * width + w);
				}
			}
			CanvasUi.PartiallyDrawColorIndex(canvas_context, pixels, target_pixel_set, width, height, scale, color);
		}

		private static DrawSelectedRectangleArea(
			canvas_context: CanvasRenderingContext2D,
			rectangle: Rectangle, scale: number, frame_count: number) {
			const e_ = 0.5;
			canvas_context.setTransform(1, 0, 0, 1, 0, 0);
			const point_left = rectangle.left * scale + e_;
			const point_top = rectangle.top * scale + e_;
			const point_right = (rectangle.right + 1) * scale - e_;
			const point_bottom = (rectangle.bottom + 1) * scale - e_;
			canvas_context.setLineDash([4, 4]);
			canvas_context.lineWidth = 1;
			canvas_context.beginPath();
			canvas_context.strokeStyle = "#ffffff";
			canvas_context.lineDashOffset = frame_count % 8;
			CanvasUi.DrawLine(canvas_context, point_left, point_top, point_right, point_top);
			CanvasUi.DrawLine(canvas_context, point_right, point_top, point_right, point_bottom);
			CanvasUi.DrawLine(canvas_context, point_right, point_bottom, point_left, point_bottom);
			CanvasUi.DrawLine(canvas_context, point_left, point_bottom, point_left, point_top);
			canvas_context.stroke();
			canvas_context.beginPath();
			canvas_context.strokeStyle = "#000000";
			canvas_context.lineDashOffset = (frame_count + 4) % 8;
			CanvasUi.DrawLine(canvas_context, point_left, point_top, point_right, point_top);
			CanvasUi.DrawLine(canvas_context, point_right, point_top, point_right, point_bottom);
			CanvasUi.DrawLine(canvas_context, point_right, point_bottom, point_left, point_bottom);
			CanvasUi.DrawLine(canvas_context, point_left, point_bottom, point_left, point_top);
			canvas_context.stroke();
			canvas_context.setLineDash([]);
		}
		private static ExtractTouchedPixelsAndGrids(
			current_pixels: number[][], last_pixels: number[][],
			current_pixel_mask: boolean[][], last_pixel_mask: boolean[][],
			width: number, height: number,
			current_colors: string[], last_colors: string[],
			last_selected_rectangle_area: Rectangle | null
		): [pixel_index_set: Set<number>, grid_w_set: Set<number>, grid_h_set: Set<number>] {
			const pixel_index_set = new Set<number>();
			const grid_w_set = new Set<number>();
			const grid_h_set = new Set<number>();
			/* ピクセル値の変化差分を抽出 */
			for (let h = 0; h < height; h++) {
				for (let w = 0; w < width; w++) {
					let is_touched = false;
					if (last_pixels[h][w] !== current_pixels[h][w]) {
						is_touched = true;
					} else if (last_pixel_mask[h][w] !== current_pixel_mask[h][w]) {
						is_touched = true;
					} else {
						/* 色が変わっている場合も更新対象 */
						const ci = last_pixels[h][w];
						if (last_colors[ci] !== current_colors[ci]) {
							is_touched = true;
						}
					}
					if (is_touched) {
						pixel_index_set.add(h * width + w);
						grid_w_set.add(w);
						grid_h_set.add(h);
					}
				}
			}
			/* 前回の矩形選択範囲の線を描画したピクセルは今回上書きが必要 */
			if (last_selected_rectangle_area !== null) {
				const rect = last_selected_rectangle_area;
				if (rect.top === rect.bottom) {
					for (let w = rect.left; w <= rect.right; w++) {
						pixel_index_set.add(rect.top * width + w);
					}
				} else {
					for (let w = rect.left; w <= rect.right; w++) {
						pixel_index_set.add(rect.top * width + w);
						pixel_index_set.add(rect.bottom * width + w);
					}
				}
				const offset_top = rect.top + 1;
				const offset_bottom = rect.bottom - 1;
				if (0 <= (offset_bottom - offset_top)) {
					if (rect.left === rect.right) {
						for (let h = offset_top; h <= offset_bottom; h++) {
							pixel_index_set.add(h * width + rect.left);
						}
					} else {
						for (let h = offset_top; h <= offset_bottom; h++) {
							pixel_index_set.add(h * width + rect.left);
							pixel_index_set.add(h * width + rect.right);
						}
					}
				}
				for (let h = rect.top; h <= rect.bottom; h++) {
					for (let w = rect.left; w <= rect.right; w++) {
						grid_w_set.add(w);
						grid_h_set.add(h);
					}
				}
			}
			return [pixel_index_set, grid_w_set, grid_h_set];
		}
		private UpdateParameters(
			large_grid_width: number, large_grid_height: number, small_grid_color: string): "need_all" | "partial" {
			const scale = parseInt(this.scale_selector_.value);
			let width = parseInt(this.canvas_width_spin_.value);
			let height = parseInt(this.canvas_height_spin_.value);
			const small_grid_view = this.small_grid_view_.checked;
			const large_grid_view = this.large_grid_view_.checked;
			const color_index_view = this.color_index_view_.checked;
			if (isNaN(width)) {
				width = this.last_width_;
			}
			if (isNaN(height)) {
				height = this.last_height_;
			}
			if (this.canvas_.width !== width * scale) {
				this.canvas_.width = width * scale;
			}
			if (this.canvas_.height !== height * scale) {
				this.canvas_.height = height * scale;
			}
			const need_update_all
				= (this.last_scale_ !== scale)
				|| (this.last_width_ !== width)
				|| (this.last_height_ !== height)
				|| (this.last_small_grid_view_ !== small_grid_view)
				|| (this.last_large_grid_view_ !== large_grid_view)
				|| (this.last_large_grid_width_ !== large_grid_width)
				|| (this.last_large_grid_height_ !== large_grid_height)
				|| (this.last_color_index_view_ !== color_index_view)
				|| (this.last_small_grid_color_ !== small_grid_color);
			this.last_scale_ = scale;
			this.last_width_ = width;
			this.last_height_ = height;
			this.last_small_grid_view_ = small_grid_view;
			this.last_large_grid_view_ = large_grid_view;
			this.last_large_grid_width_ = large_grid_width;
			this.last_large_grid_height_ = large_grid_height;
			this.last_color_index_view_ = color_index_view;
			this.last_small_grid_color_ = small_grid_color;
			return need_update_all ? "need_all" : "partial";
		}

		public Draw(
			pixels: number[][], pixels_mask: boolean[][], color_table: string[],
			small_grid_color: string,
			large_grid_width: number, large_grid_height: number,
			large_grid_color: string,
			selected_rectangle_area: { left: number, top: number, right: number, bottom: number } | null,
			frame_count: number) {
			const draw_type = this.UpdateParameters(large_grid_width, large_grid_height, small_grid_color);
			const scale = this.last_scale_;
			const width = this.last_width_;
			const height = this.last_height_;
			const context = this.canvas_.getContext("2d");
			context.imageSmoothingEnabled = false;
			context.setTransform(1, 0, 0, 1, 0, 0);
			context.scale(scale, scale);
			if (draw_type === "need_all") {
				/* ピクセル描画 */
				for (let h = 0; h < height; h++) {
					for (let w = 0; w < width; w++) {
						const color_index = pixels[h][w];
						context.fillStyle = color_table[color_index];
						context.fillRect(w, h, 1, 1);
					}
				}

				/* マスク表示 */
				context.fillStyle = '#ff0000';
				context.globalAlpha = 0.5;
				for (var h = 0; h < height; h++) {
					for (var w = 0; w < width; w++) {
						if (pixels_mask[h][w]) {
							context.fillRect(w, h, 1, 1);
						}
					}
				}
				context.globalAlpha = 1;

				/* グリッド描画 */
				if (this.small_grid_view_.checked) {
					CanvasUi.DrawSmallGrid(context, width, height, scale, small_grid_color);
				}
				/* 色番号描画 */
				if (this.color_index_view_.checked) {
					CanvasUi.DrawColorIndex(context, pixels, width, height, scale, small_grid_color);
				}

				/* キャッシュ更新 */
				for (let h = 0; h < height; h++) {
					for (let w = 0; w < width; w++) {
						this.last_pixels_[h][w] = pixels[h][w];
						this.last_pixel_mask_[h][w] = pixels_mask[h][w];
					}
				}
				/* 色のキャッシュ更新 */
				for (let i = 0; i < 256; i++) {
					this.last_colors_[i] = color_table[i];
				}
			} else {
				/* 際描画が必要なピクセルとグリッドを抽出 */
				const [written_pixel_set, update_w_grid_set, update_h_grid_set] =
					CanvasUi.ExtractTouchedPixelsAndGrids(
						pixels, this.last_pixels_, pixels_mask, this.last_pixel_mask_, width, height,
						color_table, this.last_colors_,
						this.last_selected_rectangle_area_);

				/* ピクセルの部分描画 */
				written_pixel_set.forEach((pixel_index) => {
					const w = Math.floor(pixel_index % width);
					const h = Math.floor(pixel_index / width);
					const ci = pixels[h][w];
					const color = color_table[ci];
					context.fillStyle = color;
					context.fillRect(w, h, 1, 1);
				});

				/* マスクの部分表示 */
				context.fillStyle = '#ff0000';
				context.globalAlpha = 0.5;
				written_pixel_set.forEach((pixel_index) => {
					const w = Math.floor(pixel_index % width);
					const h = Math.floor(pixel_index / width);
					if (pixels_mask[h][w]) {
						context.fillRect(w, h, 1, 1);
					}
				});
				context.globalAlpha = 1;

				/* グリッドの部分描画 */
				if (this.small_grid_view_.checked) {
					CanvasUi.PartiallyDrawGrid(context, update_w_grid_set, update_h_grid_set, width, height, scale, small_grid_color);
				}
				/* 色番号の部分描画 */
				if (this.color_index_view_.checked) {
					CanvasUi.PartiallyDrawColorIndex(context, pixels, written_pixel_set, width, height, scale, small_grid_color);
				}
			}

			if (this.large_grid_view_.checked) {
				CanvasUi.DrawLargeGrid(context, width, height, scale, large_grid_color, large_grid_width, large_grid_height);
			}

			if (selected_rectangle_area !== null) {
				CanvasUi.DrawSelectedRectangleArea(context, selected_rectangle_area, scale, frame_count);
			}

			/* キャッシュ更新 */
			/* ピクセルおよびマスク */
			for (let h = 0; h < height; h++) {
				for (let w = 0; w < width; w++) {
					this.last_pixels_[h][w] = pixels[h][w];
					this.last_pixel_mask_[h][w] = pixels_mask[h][w];
				}
			}
			/* 色　*/
			for (let i = 0; i < 256; i++) {
				this.last_colors_[i] = color_table[i];
			}
			/* 矩形選択 */
			this.last_selected_rectangle_area_ = selected_rectangle_area;
			return;
		}
		public get canvas_width(): number {
			return this.last_width_;
		}
		public get canvas_height(): number {
			return this.last_height_;
		}
		public set canvas_width(new_width: number) {
			this.canvas_width_spin_.valueAsNumber = new_width;
		}
		public set canvas_height(new_height: number) {
			this.canvas_height_spin_.valueAsNumber = new_height;
		}
		public get edit_scale(): number {
			return this.last_scale_;
		}
		public set edit_scale(new_scale: number) {
			const scales = [1, 2, 4, 8, 12, 16, 20, 24, 28, 32];
			const index = scales.indexOf(new_scale);
			if (0 <= index) {
				this.scale_selector_.selectedIndex = index;
			}
		}
	}
}
