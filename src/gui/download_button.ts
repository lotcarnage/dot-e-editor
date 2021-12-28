export type DonwloadDataRequestCallback = () => [string, Blob];
export class DonwloadButton {
	private link_: HTMLAnchorElement;
	private button_: HTMLButtonElement;
	constructor(
		parent: HTMLElement, caption: string, dldata_request_callback: DonwloadDataRequestCallback) {
		this.link_ = document.createElement("a");
		this.button_ = document.createElement("button");
		this.link_.href = "#";
		this.button_.innerText = caption;
		this.button_.addEventListener('click', () => {
			const [dldata_filename, dldata_blob] = dldata_request_callback();
			const object_url = window.URL.createObjectURL(dldata_blob);
			this.link_.href = object_url;
			this.link_.download = dldata_filename;
		});
		this.link_.appendChild(this.button_);
		parent.appendChild(this.link_);
	}
}
