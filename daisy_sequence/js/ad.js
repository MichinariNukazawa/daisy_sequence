'use strict';

class Ad{
	constructor()
	{
		this.INTERVAL_MSEC = 50;

		this.TIMEOUT_COUNT_MSEC = 2 *1000;
		this.timeout_count = this.TIMEOUT_COUNT_MSEC;

		this.HIDE_COUNT_MSEC = 1 *1000;
		this.hide_count = this.HIDE_COUNT_MSEC;

		this.ad_root_element = document.createElement('div');

		this.ad_root_element.style.cssText = 
			''
			+ 'top:' + 0 +  'px;'
			+ 'left:' + 0 + 'px;'
			+ 'width:320px;'
			+ 'position: fixed;'
			+ 'background-color:rgba(255, 255, 255, 0.95);'
			+ 'border: 1.5px solid black;'
			+ 'border-radius: 3px;'
			+ 'text-align:center;'
			;


		this.ads = [
		{
			'width': 320,
			'height': 240,
			'html':`<div>
				<image src='image/icon.png' height='100px'/>
				<br>
				<span style="font-size:400%;">daisy sequence</span><br>
				is (not) UML sequence diagram editor.
				</div>`
		},
		/*
		{
			'width': 320,
			'height': 240,
			'html':`<iframe style="width:120px;height:240px;" marginwidth="0" marginheight="0" scrolling="no" frameborder="0" src="https://rcm-fe.amazon-adsystem.com/e/cm?ref=tf_til&t=michinarinuka-22&m=amazon&o=9&p=8&l=as1&IS2=1&detail=1&asins=B00E95P4S0&linkId=5d440eb85c830cfd76e4e535a05bd6d8&bc1=000000&lt1=_blank&fc1=333333&lc1=0066c0&bg1=ffffff&f=ifr"> </iframe>`
		},
		*/
		];
	}

	get_position_(width, height)
	{
		const position = {
			'top': (window.innerHeight - height) - 150,
			'left': (window.innerWidth - width) / 2,
		};

		return position;
	}

	hide_()
	{
		let callback = function(){
			this.hide_count -= this.INTERVAL_MSEC;
			if(0 > this.hide_count){
				this.ad_root_element.style["display"] = "none";
			}else{
				this.ad_root_element.style["opacity"] =  (this.hide_count / this.HIDE_COUNT_MSEC);
				setTimeout(callback, this.INTERVAL_MSEC);
			}
		}.bind(this);
		setTimeout(callback, this.INTERVAL_MSEC);
	}

	start()
	{
		let index = Math.floor(Math.random(0, this.ads.length));
		const position = this.get_position_(this.ads[index].width, this.ads[index].height);
		console.log(index, position);

		this.ad_root_element.style["top"] = position["top"] + 'px';
		this.ad_root_element.style["left"] = position["left"] + 'px';
		this.ad_root_element.innerHTML = this.ads[index].html;

		document.body.appendChild(this.ad_root_element);
		let callback = function(){
			this.timeout_count -= this.INTERVAL_MSEC;
			// console.log("ad count:%d", this.timeout_count);
			if(0 > this.timeout_count){
				this.hide_();
			}else{
				setTimeout(callback, this.INTERVAL_MSEC);
			}
		}.bind(this);
		setTimeout(callback, this.INTERVAL_MSEC);
	}
};

