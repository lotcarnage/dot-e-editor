type SwapCallback = (lh_order: number, rh_order: number) => void;
export type RegisterUserValueCallback<UserType> = (registration_order: number) => [string, string, UserType];
export type RemovedCallback<UserType> = (target: UserType, order: number) => void;
export type UpdatedStateCallback<UserType> = (
	target: UserType, order: number, name: string, tag_color: string,
	is_locked: boolean, is_visible: boolean,
	is_focusin: boolean, is_focusout: boolean,
	thumbnail_context: CanvasRenderingContext2D) => void;
export type DrawThumbnailCallback<UserType> = (
	target: UserType, order: number, is_locked: boolean, is_visible: boolean, thumbnail_context: CanvasRenderingContext2D) => void;

export class LayerUi<UserType> {
	private parent_: HTMLElement;
	private layer_frame_: HTMLDivElement;
	private tab_: HTMLDivElement;
	private thumbnail_: HTMLCanvasElement;
	private layer_lock_checkbox_: HTMLInputElement;
	private layer_view_checkbox_: HTMLInputElement;
	private layer_name_: HTMLInputElement;
	private order_: number;
	private user_value_: UserType;
	private update_state_callback_: UpdatedStateCallback<UserType>;
	constructor(parent: HTMLElement, order: number, name: string, color: string, user_value: UserType) {
		this.parent_ = parent;
		this.user_value_ = user_value;
		this.layer_frame_ = document.createElement("div");
		this.layer_frame_.style.display = "flex";
		this.layer_frame_.style.alignItems = "center";
		this.tab_ = document.createElement("div");
		this.tab_.style.width = (40).toString();
		this.tab_.style.height = (32).toString();
		this.tab_.style.backgroundColor = color;
		this.tab_.style.display = "flex";
		this.tab_.style.justifyContent = "center";
		this.tab_.style.alignItems = "center";
		this.thumbnail_ = document.createElement("canvas");
		this.layer_lock_checkbox_ = document.createElement("input");
		this.layer_view_checkbox_ = document.createElement("input");
		this.layer_name_ = document.createElement("input");
		this.thumbnail_.width = 16;
		this.thumbnail_.height = 16;
		this.layer_lock_checkbox_.type = "checkbox";
		this.layer_lock_checkbox_.checked = false;
		this.layer_view_checkbox_.type = "checkbox";
		this.layer_view_checkbox_.checked = true;
		this.layer_name_.type = "text";
		this.layer_name_.value = name;
		this.layer_name_.style.height = '1em';
		this.layer_name_.style.paddingTop = (8).toString();
		this.layer_name_.style.paddingBottom = (8).toString();
		this.tab_.appendChild(this.thumbnail_);
		this.layer_frame_.appendChild(this.tab_);
		this.layer_frame_.appendChild(this.layer_lock_checkbox_);
		this.layer_frame_.appendChild(this.layer_view_checkbox_);
		this.layer_frame_.appendChild(this.layer_name_);
		this.order_ = order;
		this.layer_frame_.style.order = this.order_.toString();
		this.layer_frame_.tabIndex = 0;
		this.layer_frame_.style.backgroundColor = "rgb(255,255,255)";
		this.parent_.appendChild(this.layer_frame_);
	}
	public Destruct(): UserType {
		this.parent_.removeChild(this.layer_frame_);
		return this.user_value_;
	}
	public FocusIn() {
		this.layer_frame_.style.backgroundColor = 'rgb(0, 0, 255)';
		this.layer_frame_.style.boxShadow = "0px 0px 0px 0px";
		this.tab_.style.boxShadow = this.layer_frame_.style.boxShadow;
		this.Update(this.update_state_callback_, true, false);
	}
	public FocusOut() {
		this.layer_frame_.style.backgroundColor = 'rgb(255, 255, 255)';
		this.layer_frame_.style.boxShadow = "0px 8px 16px -2px rgba(10,10,10,0.1), 2px 2px 3px 0px rgba(0,0,0,0.48) inset";
		this.tab_.style.boxShadow = this.layer_frame_.style.boxShadow;
		this.Update(this.update_state_callback_, false, true);
	}
	public Update(callback: UpdatedStateCallback<UserType>, is_focusin: boolean, is_focusout: boolean) {
		callback(
			this.user_value_,
			this.order_, this.layer_name_.value, this.tab_.style.backgroundColor,
			this.layer_lock_checkbox_.checked, this.layer_view_checkbox_.checked,
			is_focusin, is_focusout,
			this.thumbnail_.getContext('2d'));
	}
	public DrawThumbnail(callback: DrawThumbnailCallback<UserType>) {
		callback(this.user_value_, this.order_, this.layer_lock_checkbox_.checked, this.layer_view_checkbox_.checked, this.thumbnail_.getContext('2d'));
	}
	public AddFoucsinCallback(
		callback: (focusin_layer: LayerUi<UserType>) => void) {
		this.layer_frame_.addEventListener('focusin', (event) => {
			callback(this);
		});
	}
	public AddUpdateStateCallback(callback: UpdatedStateCallback<UserType>) {
		this.layer_lock_checkbox_.addEventListener('change', (event) => {
			this.Update(callback, false, false);
		});
		this.layer_view_checkbox_.addEventListener('change', (event) => {
			this.Update(callback, false, false);
		});
		this.layer_name_.addEventListener('change', (event) => {
			this.Update(callback, false, false);
		});
		this.update_state_callback_ = callback;
	}

	public get order(): number {
		return this.order_;
	}
	public set order(new_order: number) {
		if (new_order < 0) {
			return;
		}
		this.order_ = new_order;
		this.layer_frame_.style.order = this.order_.toString();
		this.Update(this.update_state_callback_, false, false);
	}
}
export class LayerPaneUi<UserType> {
	private layers_: LayerUi<UserType>[];
	private frame_: HTMLDivElement;
	private command_holder_: HTMLDivElement;
	private new_layer_button_: HTMLButtonElement;
	private up_layer_button_: HTMLButtonElement;
	private down_layer_button_: HTMLButtonElement;
	private delete_layer_button_: HTMLButtonElement;
	private layer_holder_: HTMLDivElement;
	private swap_callback_: SwapCallback;
	private register_callback_: RegisterUserValueCallback<UserType>;
	private removed_callback_: RemovedCallback<UserType>;
	private updated_state_callback_: UpdatedStateCallback<UserType>;
	private draw_thumbnail_callback_: DrawThumbnailCallback<UserType>;
	private current_layer_: LayerUi<UserType> | null;
	constructor(
		register_callback: RegisterUserValueCallback<UserType>,
		destructed_callback: RemovedCallback<UserType>,
		swap_callback: SwapCallback,
		updated_state_callback: UpdatedStateCallback<UserType>,
		draw_thumbnail_callback: DrawThumbnailCallback<UserType>) {
		this.layers_ = new Array<LayerUi<UserType>>(0);
		this.frame_ = document.createElement("div");
		this.command_holder_ = document.createElement("div");
		this.new_layer_button_ = document.createElement("button");
		this.up_layer_button_ = document.createElement("button");
		this.down_layer_button_ = document.createElement("button");
		this.delete_layer_button_ = document.createElement("button");
		this.layer_holder_ = document.createElement("div");
		this.current_layer_ = null;

		this.command_holder_.style.display = "flex";
		this.command_holder_.style.backgroundColor = "rgb(95, 95, 95)";
		this.layer_holder_.style.display = "flex";
		this.layer_holder_.style.flexDirection = "column-reverse";
		this.layer_holder_.style.backgroundColor = "rgb(127, 127, 127)";
		this.new_layer_button_.innerText = "＋";
		this.up_layer_button_.innerText = "▲";
		this.down_layer_button_.innerText = "▼";
		this.delete_layer_button_.innerText = "×";

		this.new_layer_button_.addEventListener('click', (event) => {
			const registration_order = this.CalculateRegistrationOrder(this.current_layer_.order);
			const [layer_name, color, user_value] = this.register_callback_(registration_order);
			this.CreateNewLayer(this.current_layer_.order, layer_name, color, user_value);
		});
		this.up_layer_button_.addEventListener('click', (event) => {
			this.UpLayer(this.current_layer_.order);
		});
		this.down_layer_button_.addEventListener('click', (event) => {
			this.DownLayer(this.current_layer_.order);
		});
		this.delete_layer_button_.addEventListener('click', (event) => {
			if (1 < this.layers_.length) {
				this.DeleteCurrentLayer();
			}
		});

		this.register_callback_ = register_callback;
		this.removed_callback_ = destructed_callback;
		this.swap_callback_ = swap_callback;
		this.updated_state_callback_ = updated_state_callback;
		this.draw_thumbnail_callback_ = draw_thumbnail_callback;

		this.command_holder_.appendChild(this.new_layer_button_);
		this.command_holder_.appendChild(this.up_layer_button_);
		this.command_holder_.appendChild(this.down_layer_button_);
		this.command_holder_.appendChild(this.delete_layer_button_);
		this.frame_.appendChild(this.command_holder_);
		this.frame_.appendChild(this.layer_holder_);
		return;
	}
	private ChangeFocus(focus_in_layer: LayerUi<UserType>): void {
		if (focus_in_layer === this.current_layer_) {
			return;
		}
		focus_in_layer.FocusIn();
		if (this.current_layer_ !== null) {
			this.current_layer_.FocusOut();
		}
		this.current_layer_ = focus_in_layer;
		return;
	}
	private SwapLayer(lh_order: number, rh_order: number): boolean {
		let lh_layer: LayerUi<UserType> | null = null;
		let rh_layer: LayerUi<UserType> | null = null;
		for (let layer of this.layers_) {
			if (layer.order === lh_order) {
				lh_layer = layer;
			}
			if (layer.order === rh_order) {
				rh_layer = layer;
			}
			if ((lh_layer !== null) && (rh_layer !== null)) {
				break;
			}
		}
		if (lh_layer === null) {
			return false;
		}
		if (rh_layer === null) {
			return false;
		}
		const tmp_order = lh_layer.order;
		lh_layer.order = rh_layer.order;
		rh_layer.order = tmp_order;
		return true;
	}
	private CalculateRegistrationOrder(insert_target_order: number): number {
		if (this.layers_.length === 0) {
			return 0;
		}
		return Math.min(insert_target_order, this.layers_.length - 1) + 1;
	}
	public CreateNewLayer(
		insert_target_order: number, layer_name: string, color: string, user_value: UserType): void {
		const registration_order = this.CalculateRegistrationOrder(insert_target_order);
		if (0 < registration_order) {
			for (let layer of this.layers_) {
				if (registration_order <= layer.order) {
					layer.order++;
				}
			}
			insert_target_order += 1;
		}
		const new_layer = new LayerUi<UserType>(this.layer_holder_, insert_target_order, layer_name, color, user_value);
		new_layer.AddFoucsinCallback((focus_in_layer) => { this.ChangeFocus(focus_in_layer); });
		new_layer.AddUpdateStateCallback(this.updated_state_callback_);
		this.layers_.push(new_layer);
		this.ChangeFocus(new_layer);
		return;
	}
	public DeleteCurrentLayer(): void {
		if (this.current_layer_ === null) {
			return;
		}
		if (this.layers_.length === 1) {
			const destructed_order = this.current_layer_.order;
			const user_value = this.current_layer_.Destruct();
			this.removed_callback_(user_value, destructed_order);
			this.current_layer_ = null;
			this.layers_.splice(0, 1);
			return;
		}
		let target_index;
		for (target_index = 0; target_index < this.layers_.length; target_index++) {
			if (this.layers_[target_index] === this.current_layer_) {
				break;
			}
		}
		this.layers_.splice(target_index, 1);
		const current_order = Math.min(this.current_layer_.order, this.layers_.length - 1);
		for (let layer of this.layers_) {
			if (current_order < layer.order) {
				layer.order--;
			}
			if (current_order === layer.order) {
				const destructed_order = this.current_layer_.order;
				const user_value = this.current_layer_.Destruct();
				this.removed_callback_(user_value, destructed_order);
				this.current_layer_ = layer;
			}
		}
		this.current_layer_.FocusIn();
		return;
	}
	public DeleteAll() {
		const num_layers = this.layers_.length;
		for (let i = 0; i < num_layers; i++) {
			this.DeleteCurrentLayer();
		}
	}

	public CreateNewLayers(creation_parameters: Array<[number, string, string, UserType]>) {
		const ordered_parameters: [number, string, string, UserType][] = Array<[number, string, string, UserType]>(creation_parameters.length);
		for (let parameter of creation_parameters) {
			ordered_parameters[parameter[0]] = parameter;
		}
		for (let parameter of ordered_parameters) {
			parameter[0] = Math.max(0, parameter[0] - 1);
			this.CreateNewLayer(...parameter);
		}
	}
	public UpLayer(target_order: number): void {
		if (this.SwapLayer(target_order, target_order + 1)) {
			this.swap_callback_(target_order, target_order + 1);
		}
		return;
	}
	public DownLayer(target_order: number): void {
		if (this.SwapLayer(target_order, target_order - 1)) {
			this.swap_callback_(target_order, target_order - 1);
		}
		return;
	}
	public Draw() {
		for (let layer of this.layers_) {
			layer.DrawThumbnail(this.draw_thumbnail_callback_);
		}
	}
	public get node(): HTMLDivElement {
		return this.frame_;
	}
}
