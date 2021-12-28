export class TabPaneUi {
	private tab_frame_: HTMLDivElement;
	private local_tab_count_: number;
	private current_tab_: HTMLDivElement | null;
	private static tab_content_class_style_: HTMLStyleElement | null = null;
	private static global_tab_count_: number = 0;
	constructor() {
		if (TabPaneUi.tab_content_class_style_ === null) {
			const style = document.createElement("style");
			style.innerText
				= `.tab_content {`
				+ `display: none;`
				+ `clear: both;`
				+ `overflow: scroll;`
				+ `resize: both;`
				+ `}`
				+ `input[name="tab_tags"] {`
				+ `display: none;`
				+ `}`
				+ `.tab_tag {`
				+ `text-align: center;`
				+ `display: block;`
				+ `float: left;`
				+ `order: -1;`
				+ `margin: 2px 2px 0px;`
				+ `}`
				+ `input:checked + .tab_tag + .tab_content {`
				+ `display: block;`
				+ `}`;
			document.getElementsByTagName("head").item(0).appendChild(style);
			TabPaneUi.tab_content_class_style_ = style;
		}
		this.tab_frame_ = document.createElement("div");
		this.tab_frame_.style.display = "grid";
		//this.tab_frame_.style.gridAutoColumns = "max-content";
		this.tab_frame_.style.gridAutoColumns = "1fr";
		this.tab_frame_.style.gridAutoRows = "max-content";
		this.tab_frame_.style.gridTemplateAreas = `"t0" "c"`;
		this.current_tab_ = null;
		this.local_tab_count_ = 0;
	}
	private FitSize(): void {
		if (!("width" in this.current_tab_.style)) {
			return;
		}
		const contents = <HTMLCollectionOf<HTMLDivElement>>this.tab_frame_.getElementsByClassName("tab_content");
		const length = contents.length;
		for (let i = 0; i < length; i++) {
			contents[i].style.width = this.current_tab_.style.width;
			contents[i].style.height = this.current_tab_.style.height;
		}
		return;
	}
	public AddTab(content: HTMLElement, tab_title: string): void {
		const tag_id = `tab_${TabPaneUi.global_tab_count_}_tag`;
		const tab_radio = document.createElement("input");
		tab_radio.type = "radio";
		tab_radio.id = tag_id;
		tab_radio.name = "tab_tags";
		const tab_label = document.createElement("label");
		tab_label.htmlFor = tag_id;
		tab_label.innerText = tab_title;
		tab_label.className = "tab_tag";
		tab_label.style.backgroundColor = content.style.backgroundColor;
		tab_label.style.gridArea = `t${this.local_tab_count_}`;

		const content_frame = document.createElement("div");
		content_frame.appendChild(content);
		content_frame.className = "tab_content";
		content_frame.style.backgroundColor = content.style.backgroundColor;
		content_frame.style.order = "1";
		content_frame.style.gridArea = "c";

		if (this.tab_frame_.childElementCount === 0) {
			tab_radio.checked = true;
			this.current_tab_ = content_frame;
		}
		tab_radio.addEventListener("change", (event) => {
			this.FitSize();
			this.current_tab_ = content_frame;
		});

		this.local_tab_count_++;
		const tag_grids = new Array<string>(this.local_tab_count_);
		const content_grids = new Array<string>(this.local_tab_count_);
		for (let i = 0; i < this.local_tab_count_; i++) {
			tag_grids[i] = `t${i}`;
			content_grids[i] = "c";
		}
		this.tab_frame_.style.gridTemplateAreas = `"${tag_grids.join(" ")}" "${content_grids.join(" ")}"`;

		this.tab_frame_.appendChild(tab_radio);
		this.tab_frame_.appendChild(tab_label);
		this.tab_frame_.appendChild(content_frame);
		TabPaneUi.global_tab_count_++;
		return;
	}
	public get node(): HTMLDivElement {
		return this.tab_frame_;
	}
}
