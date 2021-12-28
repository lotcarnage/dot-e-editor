import { Misc } from "./misc";
export class PixelPoint {
	public w: number;
	public h: number;
	public constructor(w: number, h: number) {
		this.w = w;
		this.h = h;
	}
	ToIndex(width: number): number {
		return width * this.h + this.w;
	}
	static IndexToPixelPoint(index: number, width: number): PixelPoint {
		const w = Math.floor(index % width);
		const h = Math.floor(index / width);
		return new PixelPoint(w, h);
	}
	static IndexToPixelPointW(index: number, width: number): number {
		return Math.floor(index % width);
	}
	static IndexToPixelPointH(index: number, width: number): number {
		return Math.floor(index / width);
	}
}


export namespace CanvasTools {
	export class Tool {
		public LeftButtonDown(pixel_w: number, pixel_h: number) { };
		public LeftButtonUp(pixel_w: number, pixel_h: number) { };
		public RightButtonDown(pixel_w: number, pixel_h: number) { };
		public RightButtonUp(pixel_w: number, pixel_h: number) { };
		public MouseMove(pixel_w: number, pixel_h: number) { };
		public MouseOut(pixel_w: number, pixel_h: number) { };
	}

	type IsPixelWritableCallback = (x: number, y: number) => boolean;
	type WritePixelCallback = (x: number, y: number) => void;
	type GetPixelCallback = (x: number, y: number) => number;
	type ColorPickerCallback = (x: number, y: number) => void;
	type GetCanvasSizeCallback = () => [width: number, height: number];
	type GetViewScaleCallback = () => number;
	type SelectAreaUpdateCallback = (start_x: number, start_y: number, end_x: number, end_y: number) => void;
	type PreChangeCallback = () => void;
	type PostChangeCallback = () => void;
	type BeginCallback = () => void;
	type EndCallback = () => void;

	export class CallbackTable {
		public is_pixel_writable_cb_: IsPixelWritableCallback;
		public write_pixel_cb_: WritePixelCallback;
		public get_pixel_cb_: GetPixelCallback;
		public get_canvas_size_cb_: GetCanvasSizeCallback;
		public get_view_scale_cb_: GetViewScaleCallback;
		public color_picker_cb_: ColorPickerCallback;
		public select_area_update_cb_: SelectAreaUpdateCallback;
		public begin_cb_: BeginCallback;
		public prechange_cb_: PreChangeCallback;
		public postchange_cb_: PostChangeCallback;
		public end_cb_: EndCallback;
		constructor(
			is_pixel_writable_cb_: IsPixelWritableCallback,
			write_pixel_cb_: WritePixelCallback,
			get_pixel_cb_: GetPixelCallback,
			get_canvas_size_cb_: GetCanvasSizeCallback,
			get_view_scale_cb_: GetViewScaleCallback,
			color_picker_cb_: ColorPickerCallback,
			select_area_update_cb_: SelectAreaUpdateCallback,
			begin_cb_: BeginCallback,
			prechange_cb_: PreChangeCallback,
			postchange_cb_: PostChangeCallback,
			end_cb_: EndCallback
		) {
			this.is_pixel_writable_cb_ = is_pixel_writable_cb_;
			this.write_pixel_cb_ = write_pixel_cb_;
			this.get_pixel_cb_ = get_pixel_cb_;
			this.get_canvas_size_cb_ = get_canvas_size_cb_;
			this.get_view_scale_cb_ = get_view_scale_cb_;
			this.color_picker_cb_ = color_picker_cb_;
			this.select_area_update_cb_ = select_area_update_cb_;
			this.begin_cb_ = begin_cb_;
			this.prechange_cb_ = prechange_cb_;
			this.postchange_cb_ = postchange_cb_;
			this.end_cb_ = end_cb_;
		}
	}
	export class PenTool extends Tool {
		private is_activated: boolean = false;
		private last_point_w: number;
		private last_point_h: number;
		private cb_table_: CallbackTable;
		constructor(cb_table: CallbackTable) {
			super();
			this.cb_table_ = cb_table;
		}
		public LeftButtonDown(pixel_w: number, pixel_h: number) {
			this.cb_table_.begin_cb_();
			this.cb_table_.prechange_cb_();
			this.cb_table_.write_pixel_cb_(pixel_w, pixel_h);
			this.last_point_w = pixel_w;
			this.last_point_h = pixel_h;
			this.is_activated = true;
			return;
		};
		public LeftButtonUp(pixel_w: number, pixel_h: number) {
			this.is_activated = false;
			this.cb_table_.postchange_cb_();
			this.cb_table_.end_cb_();
		}
		public RightButtonDown(pixel_w: number, pixel_h: number) {
			this.cb_table_.color_picker_cb_(pixel_w, pixel_h);
			return;
		};
		public MouseMove(pixel_w: number, pixel_h: number) {
			if (this.is_activated) {
				Misc.LineTo2d(this.last_point_w, this.last_point_h, pixel_w, pixel_h, this.cb_table_.write_pixel_cb_);
			} else {
				this.cb_table_.begin_cb_();
				this.cb_table_.prechange_cb_();
			}
			this.last_point_w = pixel_w;
			this.last_point_h = pixel_h;
			this.is_activated = true;
			return;
		};
		public MouseOut(pixel_w: number, pixel_h: number) {
			if (this.is_activated) {
				Misc.LineTo2d(this.last_point_w, this.last_point_h, pixel_w, pixel_h, this.cb_table_.write_pixel_cb_);
			}
			this.is_activated = false;
		};
	}

	export class PaintTool extends Tool {
		private cb_table_: CallbackTable;
		constructor(cb_table: CallbackTable) {
			super();
			this.cb_table_ = cb_table;
		}
		private ExtractRegionPixelSet(start_point: PixelPoint, max_w: number, max_h: number): Set<number> {
			const min_w = 0;
			const min_h = 0;
			const region_pixels = new Set<number>();
			const next_pixel_queue: PixelPoint[] = new Array<PixelPoint>();
			const target_color_index: number = this.cb_table_.get_pixel_cb_(start_point.w, start_point.h);
			region_pixels.add(start_point.ToIndex(max_w));
			next_pixel_queue.push(start_point);
			const AddPixelToRegion = (new_point: PixelPoint) => {
				if (this.cb_table_.get_pixel_cb_(new_point.w, new_point.h) !== target_color_index) {
					return;
				}
				if (region_pixels.has(new_point.ToIndex(max_w))) {
					return;
				}
				next_pixel_queue.push(new_point);
				region_pixels.add(new_point.ToIndex(max_w));
				return;
			}
			for (; ;) {
				if (next_pixel_queue.length === 0) {
					break;
				}
				let pixel = next_pixel_queue.shift();
				if (min_h < pixel.h) {
					if (this.cb_table_.is_pixel_writable_cb_(pixel.w + 0, pixel.h - 1)) {
						AddPixelToRegion(new PixelPoint(pixel.w + 0, pixel.h - 1));
					}
				}
				if (min_w < pixel.w) {
					if (this.cb_table_.is_pixel_writable_cb_(pixel.w - 1, pixel.h + 0)) {
						AddPixelToRegion(new PixelPoint(pixel.w - 1, pixel.h + 0));
					}
				}
				if (pixel.w < max_w - 1) {
					if (this.cb_table_.is_pixel_writable_cb_(pixel.w + 1, pixel.h + 0)) {
						AddPixelToRegion(new PixelPoint(pixel.w + 1, pixel.h + 0));
					}
				}
				if (pixel.h < max_h - 1) {
					if (this.cb_table_.is_pixel_writable_cb_(pixel.w + 0, pixel.h + 1)) {
						AddPixelToRegion(new PixelPoint(pixel.w + 0, pixel.h + 1));
					}
				}
			}
			return region_pixels;
		};

		public LeftButtonDown(pixel_w: number, pixel_h: number) {
			this.cb_table_.begin_cb_();
			this.cb_table_.prechange_cb_();
			const selected_pixel = new PixelPoint(pixel_w, pixel_h);
			const [max_w, max_h] = this.cb_table_.get_canvas_size_cb_();
			const region_pixel_set = this.ExtractRegionPixelSet(selected_pixel, max_w, max_h);
			region_pixel_set.forEach((pixel_index) => {
				const w = PixelPoint.IndexToPixelPointW(pixel_index, max_w);
				const h = PixelPoint.IndexToPixelPointH(pixel_index, max_w);
				this.cb_table_.write_pixel_cb_(w, h);
			});
			this.cb_table_.postchange_cb_();
			this.cb_table_.end_cb_();
		};
		public RightButtonDown(x: number, y: number) {
			this.cb_table_.color_picker_cb_(x, y);
		};
	}

	export class RectangleSelectTool extends Tool {
		private start_x: number = 0;
		private start_y: number = 0;
		private cb_table_: CallbackTable;
		constructor(cb_table: CallbackTable) {
			super();
			this.cb_table_ = cb_table;
		}
		public LeftButtonDown(start_x: number, start_y: number) {
			this.start_x = start_x;
			this.start_y = start_y;
			this.cb_table_.select_area_update_cb_(this.start_x, this.start_y, this.start_x, this.start_y);
		};
		public MouseMove(end_x: number, end_y: number) {
			this.cb_table_.select_area_update_cb_(this.start_x, this.start_y, end_x, end_y);
			return;
		};
	}


	type ToolKind = "pen" | "paint" | "rectangle_select";
	export class CanvasTools {
		private cb_table_: CallbackTable;
		private pen_tool_: PenTool;
		private paint_tool_: PaintTool;
		private rectangle_select_tool_: RectangleSelectTool;
		private current_tool_: Tool;
		private static GetPixelPoint(event: MouseEvent, block_size: number): [number, number] {
			const rect: DOMRect = (<HTMLCanvasElement>event.target).getBoundingClientRect();
			const w: number = Math.floor((event.clientX - rect.left) / block_size);
			const h: number = Math.floor((event.clientY - rect.top) / block_size);
			return [w, h];
		};
		private static GetTouchPixelPoint(event: TouchEvent, block_size: number): [number, number] {
			const rect: DOMRect = (<HTMLCanvasElement>event.target).getBoundingClientRect();
			const w: number = Math.floor((event.touches[0].clientX - rect.left) / block_size);
			const h: number = Math.floor((event.touches[0].clientY - rect.top) / block_size);
			return [w, h];
		};


		constructor(
			is_pixel_writable_cb_: IsPixelWritableCallback,
			write_pixel_cb_: WritePixelCallback,
			get_pixel_cb_: GetPixelCallback,
			get_canvas_size_cb_: GetCanvasSizeCallback,
			get_view_scale_cb_: GetViewScaleCallback,
			color_picker_cb_: ColorPickerCallback,
			select_area_update_cb_: SelectAreaUpdateCallback,
			begin_cb_: BeginCallback,
			prechange_cb_: PreChangeCallback,
			postchange_cb_: PostChangeCallback,
			end_cb_: EndCallback
		) {
			this.cb_table_ = new CallbackTable(
				is_pixel_writable_cb_, write_pixel_cb_,
				get_pixel_cb_, get_canvas_size_cb_, get_view_scale_cb_,
				color_picker_cb_, select_area_update_cb_,
				begin_cb_, prechange_cb_, postchange_cb_, end_cb_);
			this.pen_tool_ = new PenTool(this.cb_table_);
			this.paint_tool_ = new PaintTool(this.cb_table_);
			this.rectangle_select_tool_ = new RectangleSelectTool(this.cb_table_);
			this.current_tool_ = this.pen_tool_;
		}

		private MouseDownCallback(event: MouseEvent) {
			if (event.button === 0) {
				this.current_tool_.LeftButtonDown(...CanvasTools.GetPixelPoint(event, this.cb_table_.get_view_scale_cb_()));
			} else if (event.button === 2) {
				this.current_tool_.RightButtonDown(...CanvasTools.GetPixelPoint(event, this.cb_table_.get_view_scale_cb_()));
			}
		};

		private MouseUpCallback(event: MouseEvent) {
			if (event.button === 0) {
				this.current_tool_.LeftButtonUp(...CanvasTools.GetPixelPoint(event, this.cb_table_.get_view_scale_cb_()));
			} else if (event.button === 2) {
				this.current_tool_.RightButtonUp(...CanvasTools.GetPixelPoint(event, this.cb_table_.get_view_scale_cb_()));
			}
		};

		private MouseMoveCallback(event: MouseEvent) {
			if (event.buttons === 0x01) {
				this.current_tool_.MouseMove(...CanvasTools.GetPixelPoint(event, this.cb_table_.get_view_scale_cb_()));
			}
		};

		private MouseOutCallback(event: MouseEvent) {
			if (event.buttons === 0x01) {
				this.current_tool_.MouseOut(...CanvasTools.GetPixelPoint(event, this.cb_table_.get_view_scale_cb_()));
			}
		};

		private TouchStartCallback(event: TouchEvent) {
			if (event.touches.length === 1) {
				this.current_tool_.LeftButtonDown(...CanvasTools.GetTouchPixelPoint(event, this.cb_table_.get_view_scale_cb_()));
			}
		};

		private TouchEndCallback(event: TouchEvent) {
			if (event.touches.length === 1) {
				this.current_tool_.LeftButtonUp(...CanvasTools.GetTouchPixelPoint(event, this.cb_table_.get_view_scale_cb_()));
			}
		};

		private TouchMoveCallback(event: TouchEvent) {
			if (event.touches.length === 1) {
				this.current_tool_.MouseMove(...CanvasTools.GetTouchPixelPoint(event, this.cb_table_.get_view_scale_cb_()));
			}
			event.preventDefault();
		};

		public Attach(canvas: HTMLCanvasElement) {
			canvas.addEventListener('mousedown', (event) => { this.MouseDownCallback(event) });
			canvas.addEventListener('mouseup', (event) => { this.MouseUpCallback(event) });
			canvas.addEventListener('contextmenu', (event) => { this.MouseDownCallback(event) });
			canvas.addEventListener('mousemove', (event) => { this.MouseMoveCallback(event) });
			canvas.addEventListener('mouseout', (event) => { this.MouseOutCallback(event) });
			canvas.addEventListener('touchstart', (event) => { this.TouchStartCallback(event) });
			canvas.addEventListener('touchend', (event) => { this.TouchEndCallback(event) });
			canvas.addEventListener('touchmove', (event) => { this.TouchMoveCallback(event) });
		}
		public set tool_kind(kind: ToolKind) {
			switch (kind) {
				case "pen":
					this.current_tool_ = this.pen_tool_;
					break;
				case "paint":
					this.current_tool_ = this.paint_tool_;
					break;
				case "rectangle_select":
					this.current_tool_ = this.rectangle_select_tool_;
					break;
			}
		}
	}
}