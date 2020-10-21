class GameObject{
	constructor(g){
		this.game = g;
		this.state = {
			'grounded':{
				// 0 on ground, 1 pushed up, 2 falling with ground under, 3 falling with no ground under
				'position':0,
				'fallSpeed':0.49/2 + 0.49,
			},
			'pushed':{
				// 0 no push, 1 left, 2 right
				'dir':0,
				'startSpeed':0,
				'normal':0,
			},
			'explode':{
				'timer':new THREE.Clock(false),
				'last':0,
				'oscillate':0.05,
				// 0->1 blue to white, 1->2 white to red, 
				'color':0,
				'cDir':true,
			},
		};
		
		this.origin = {	
			x:-25,
			y:-35,
			z:0,
		};
		
		//it would be nice to allow passing an object/mesh 
		//that into the constructor
		this.testgeometry = new THREE.BoxGeometry(1,1,1);
		this.testmaterial = new THREE.MeshBasicMaterial({color: 0x0000ff});
		this.cube = new THREE.Mesh(this.testgeometry, this.testmaterial);
		this.cube.position.set(this.origin.x,this.origin.y,this.origin.z);
		this.game.scene.add(this.cube);
	}
	// update push with given direction, and distance 
	pushUpdate(dir, distance){
		this.state.pushed.dir = dir;
		this.state.pushed.startSpeed = distance;
	}
	// this needs retooling for stationary objects 
	checkCollision(objs){
		
	}
	
	respawn(score=1){
		this.state.explode.timer.stop();
		if(this.game.state.score == 0 && score < 0){
			this.game.state.score = 0;
		}else{
			this.game.state.score += score;
		}
		this.origin.x = Game.getRandomInt(this.game.resetPos.x - this.game.state.floor.size/2, this.game.resetPos.x + this.game.state.floor.size/2);
		this.origin.y = Game.getRandomInt(this.game.resetPos.y, this.game.resetPos.y + 40);
		this.state.grounded.position = 0;
		this.cube.material.color.setRGB(0,0,1);
	}
	
	ticking(){
		if(this.state.explode.timer.getElapsedTime() < 1) return;
		else if(this.state.explode.timer.getElapsedTime() > 5 || 
				!this.state.explode.timer.running){
			this.cube.scale.x = 1;
			this.cube.scale.y = 1;
			this.state.pushed.normal = 0
			this.state.explode.color = 0;
			this.state.explode.last = 0;
			this.cube.material.color.r = this.cube.material.color.g = 0;
			return;
		}
		this.cube.scale.x = this.state.explode.timer.getElapsedTime();
		this.cube.scale.y = this.state.explode.timer.getElapsedTime();
		this.state.pushed.normal = Game.normalize(this.cube.scale.x, 1,5) * 2;
		this.colorAdjust();
	}
	
	//creates explosion effect.  color switches every 0.5 seconds
	colorAdjust(){
		if(this.state.explode.timer.getElapsedTime() > this.state.explode.last + 0.5){
			this.state.explode.last = this.state.explode.timer.getElapsedTime();
			if(this.state.explode.cDir) {
				this.state.explode.color += 1;
				if(this.state.explode.color == 2) this.state.explode.cDir = false;
			}else{
				this.state.explode.color -= 1;
				if(this.state.explode.color <= 0) {
					this.state.explode.cDir = true;
					this.state.explode.color = 1;
				}
			}
		}
		switch(this.state.explode.color){
			case 0:
				this.cube.material.color.lerp(new THREE.Color(1,1,1), this.state.explode.oscillate);
				break;
			case 1:
				(this.state.explode.cDir) ? this.cube.material.color.lerp(new THREE.Color(1,0,0), this.state.explode.oscillate) :
					this.cube.material.color.lerp(new THREE.Color(0,0,1), this.state.explode.oscillate);
				break;
			case 2:
				this.cube.material.color.lerp(new THREE.Color(1,1,1), this.state.explode.oscillate);
				break;
			default:
				break;
		}
	}
	
	onTheFloor(){
		if(this.game.floorCheck(this)){
			this.state.grounded.position = 3;
		}else if(this.origin.y > this.game.resetPos.y){
			this.state.grounded.position = 2;
		}
		switch(this.state.grounded.position){
			case 0:
				if(!this.state.explode.timer.running && 
					this.game.state.playing == 1) this.state.explode.timer.start();
				else if(this.state.explode.timer.getElapsedTime() > 5){
					if(this.game.state.playing == 1) this.game.floorBreak();
					this.respawn(-1);
				}
				break;
			case 1:
				// needs implementing
				break;
			case 2:
				this.origin.y -= this.state.grounded.fallSpeed;
				if(this.origin.y < this.game.resetPos.y){
					this.origin.y = this.game.resetPos.y;
					this.state.grounded.position = 0;
				}
				break;
			case 3:
				this.origin.y -= this.state.grounded.fallSpeed;
				if(this.origin.y < this.game.resetPos.y - 10){
					this.respawn();
				}
				break;
			default:
				break;
		}
		switch(this.state.pushed.dir){
			case 0:
				// needs implementing
				break;
			case 1:
				this.origin.x -= this.state.pushed.startSpeed;
				this.state.pushed.startSpeed /= 2;
				if(this.state.pushed.startSpeed < 0.125){
					this.state.pushed.dir = 0;
				}
				break;
			case 2:
				this.origin.x += this.state.pushed.startSpeed;
				this.state.pushed.startSpeed /= 2;
				if(this.state.pushed.startSpeed < 0.125){
					this.state.pushed.dir = 0;
				}
				break;
			default:
				break;
		}
	}
	update(){
		this.ticking();
		this.onTheFloor();
		this.cube.position.set(this.origin.x, this.origin.y + this.state.pushed.normal, this.origin.z);
	}
}
class Player{
	constructor(g){
		this.game = g;
		this.moveSpeed = 0.5;
		this.toWhite = 0.01;
		this.starSpeed = 0.0625;
		this.state = {
			// 0 or 1 can fire, 2 fired
			// 0 --> 1 back to white
			// 1 --> 0 back to green
			'bar': 1,
			'up':false,
			'down':false,
			// 0 can, 1 left, 2 right, 3 can't move
			'xDir':0,
			'jumpState':{
				// 0 on ground, 1 going up, 2 falling with ground under, 3 falling with no ground under
				'position':0,
				'jumpY':0,
				'jumpSpeed':0.49/2 + 0.49,
			},
			'timer': new THREE.Clock(),
			// for mobile use
			'mouse':{
				x:0,
				y:0,
			},
			'bonk':{
				'dir':0,
				'to':0,
				'obj':null,
			},
			'effect':{
				'colRadiusAdd':0,
				'position': new THREE.Vector3(0,0,0),
			}
		};
		this.origin = {	
			x:-35,
			y:-35,
			z:0,
		};
		this.geometry = new THREE.BoxGeometry(1,1,1);
		this.material = new THREE.MeshBasicMaterial({color: 0x00ff00});
		this.cube = new THREE.Mesh(this.geometry, this.material);
		this.game.scene.add(this.cube);
		
		// push ready bar
		this.readyGeometry = new THREE.BoxGeometry(5,1,1);
		this.readyColor = new THREE.Color(1,1,1);
		this.readyMaterial = new THREE.MeshBasicMaterial({color:this.readyColor});
		this.bar = new THREE.Mesh(this.readyGeometry, this.readyMaterial);
		this.game.scene.add(this.bar);
		
		this.bar.position.set(this.origin.x, this.origin.y - 2, this.origin.z);
		this.lines = [];
		for(var i = 0; i < 200; i++){
			this.lines[i] = this.makeLine();
		}
	}
	
	// set all input listeners for controlling player
	setListeners(o,w){
		if( /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) ) {
			w.addEventListener('touchmove', function(e){
				if(o.game.state.playing != 1) return;
				if(o.state.xDir != 3){
					if(o.state.mouse.x > e.touches[0].clientX){
						o.state.xDir = 1;
					}
					if(o.state.mouse.x < e.touches[0].clientX){
						o.state.xDir = 2;
					}
				}
				o.state.mouse.x = e.touches[0].clientX;
			});
			w.addEventListener('touchstart', function(e){
				if(o.game.state.playing != 1) return;
				if(o.state.c != undefined || o.state.c != null) o.state.c = null;
				o.state.mouse.y = e.touches[0].clientY;
				o.state.mouse.x = e.touches[0].clientX;
			});
			w.addEventListener('touchend', function(e){
				if(o.game.state.playing != 1) return;
				if(o.state.xDir == 0 && !o.state.timer.running){
					o.game.playSound('explosion');
					o.game.floorBreak();
					o.emit();
					o.state.timer.start();
				}else if(o.state.mouse.y - e.changedTouches[0].clientY > 200 
							&& o.state.jumpState.position == 0){ 
					o.state.jumpState.position = 1;
					o.state.jumpState.jumpY = o.origin.y + 10;
					o.game.playSound('jump');
				}
				o.state.xDir = 0;
				o.moveSpeed = 0.1;
			});
			o.game.gameOver.addEventListener('click', function(e){
				if(o.game.state.playing == 0) o.game.startUpSounds();
				if(o.game.state.playing != 1) o.game.state.playing = 1;
			});
		}else{
			o.game.gameOver.addEventListener('click', function(e){
				if(o.game.state.playing == 0) o.game.startUpSounds();
				if(o.game.state.playing != 1) o.game.state.playing = 1;
			});
			w.addEventListener('keydown', function(e){
				if(o.game.state.playing != 1 && e.key.toLowerCase() == 'q') {
					o.game.state.playing = 1;
				}else if(o.game.state.playing != 1){
					return;
				}
				switch(e.key.toLowerCase()){
					case 'arrowdown':
					case 's':
						//state.down = true;
						break;
					case 'arrowup':
					case 'w':
						//state.up = true
						if(o.state.jumpState.position != 0) break;
						o.state.jumpState.position = 1;
						o.state.jumpState.jumpY = o.origin.y + 10;
						o.game.playSound('jump');
						break;
					case 'arrowright':
					case 'd':
						o.state.xDir = 2;
						break;
					case 'arrowleft':
					case 'a':
						o.state.xDir = 1;
						break;
					case ' ':
						if(!o.state.timer.running) {
							o.game.floorBreak();
							o.game.playSound('explosion');
							o.emit();
							o.state.timer.start();
							o.state.effect.position.setX(o.origin.x-0.25);
							o.state.effect.position.setY(o.origin.y-0.25);
						}
						break;
					default:
						break;
				}
			});
			w.addEventListener('keyup', function(e){
				if(o.game.state.playing != 1) return;
				switch(e.key.toLowerCase()){
					case 'arrowdown':
					case 's':
					case 'arrowup':
					case 'w':
					case 'arrowright':
					case 'd':
					case 'arrowleft':
					case 'a':
						o.state.xDir = 0;
						o.moveSpeed = 0.1;
						break;
					default:
						break;
				}
			});
		}
	}
	/******************************************
		Functions for line creation effects
	*******************************************/
	// sets/resets line position appropriately
	toNewLine(line, done=false){
		line.to_y = Game.getRandomInt(this.origin.y-10, this.origin.y+10);
		line.to_x = Game.getRandomInt(this.origin.x-10, this.origin.x+10);
		line.currentColor = 1;
		line.geometry.vertices[0].set(this.origin.x-0.25, this.origin.y-0.25, this.origin.z);
		line.geometry.vertices[1].set(this.origin.x-0.25, this.origin.y-0.25, this.origin.z);
		if(done){
			line.imdone = true;
		}
	}
	
	//initializes lines
	makeLine(){
		var lineColor = new THREE.Color(1,1,1);
		var material = new THREE.LineBasicMaterial({color:lineColor});
		
		var geometry = new THREE.Geometry();
		geometry.vertices.push(new THREE.Vector3(this.origin.x, this.origin.y, this.origin.z));
		geometry.vertices.push(new THREE.Vector3(this.origin.x, this.origin.y, this.origin.z));
		var line = new THREE.Line(geometry, material);
		this.game.scene.add(line);
		
		line.to_y = Game.getRandomInt(this.origin.y-100, this.origin.y+100);
		line.to_x = Game.getRandomInt(this.origin.x-100, this.origin.x+100);
		line.x1 = line.to_x/60, line.x2 = line.to_x/55;
		line.y1 = line.to_y/60, line.y2 = line.to_y/55;
		
		this.toNewLine(line);
		
		line.imdone = false;
		
		return line;
	}
	
	// triggers line spread out effect 
	emit(){
		for(var i = 0; i < this.lines.length; i++){
			this.toNewLine(this.lines[i]);
		}
	}
	
	// updates position of line
	updateXY(line){
		if(line.to_x <= 0){
			line.geometry.vertices[1].x -= line.x1 * this.starSpeed;
			line.geometry.vertices[0].x -= line.x2 * this.starSpeed;
		}else{
			line.geometry.vertices[1].x += line.x1 * this.starSpeed;
			line.geometry.vertices[0].x += line.x2 * this.starSpeed;
		}
		if(line.to_y <= 0){
			line.geometry.vertices[0].y -= line.y2 * this.starSpeed;
			line.geometry.vertices[1].y -= line.y1 * this.starSpeed;
		}else{
			line.geometry.vertices[0].y += line.y2 * this.starSpeed;
			line.geometry.vertices[1].y += line.y1 * this.starSpeed;
		}
		if(Math.abs(line.geometry.vertices[0].x) > Math.abs(line.to_x)) this.toNewLine(line, true);
	}
	
	//updates color of line (fade to black)
	updateColor(line){
		line.currentColor -= this.toWhite;
		line.material.color.setScalar(line.currentColor);
	}
	
	// updates line in entirety if line timer is running 
	updateLine(){
		if(!this.state.timer.running || this.game.state.playing == 2) return;
		this.state.effect.colRadiusAdd = this.state.timer.getElapsedTime() + 2;
		if(this.state.timer.getElapsedTime() > 5) {
			this.state.timer.stop();
			for(var i = 0; i < this.lines.length ; i++){
				this.lines[i].imdone = false;
			}
			this.bar.geometry.width = 5;
			this.state.effect.colRadiusAdd = 0;
			return;
		}
		for(var i = 0; i < this.lines.length ; i++){
			if(!this.lines[i].imdone){
				this.updateColor(this.lines[i]);
				this.updateXY(this.lines[i]);
				this.lines[i].geometry.verticesNeedUpdate = true;
			}
		}
	}
	
	// check if the player has collided with the given objects 
	checkCollision(obj){
		var r = new THREE.Raycaster();
		r.set(this.cube.position, new THREE.Vector3(this.moveSpeed,0,0).normalize());
		var s = r.intersectObject(obj.cube);
		for(var i = 0; i < s.length; i++){
			if(this.state.xDir == 2 && 
				this.cube.position.distanceTo(s[i].object.position) < 2 + obj.state.pushed.normal){
				if(this.cube.position.y - s[i].object.position > 1) continue;
				this.state.bonk.to = -10;
				this.state.xDir = 3;
				this.state.bonk.obj = obj;
				this.moveSpeed = 0.1;
				this.game.playSound('bump');
			}
		}
		r.set(this.cube.position, new THREE.Vector3(this.moveSpeed * -1,0,0).normalize());
		s = r.intersectObject(obj.cube);
		for(var i = 0; i < s.length; i++){
			if(this.state.xDir == 1 && 
				this.cube.position.distanceTo(s[i].object.position) < 2 + obj.state.pushed.normal){
				if(this.cube.position.y - s[i].object.position > 1 + this.state.effect.colRadiusAdd) continue;
				this.state.bonk.to = 10;
				this.state.xDir = 3;
				this.state.bonk.obj = obj;
				this.moveSpeed = 0.1;
				this.game.playSound('bump');
			}
		}
	}
	checkExplosionPush(){
		if(!this.state.timer.running || this.state.timer.getElapsedTime() > 3) return;
		for(var i = 0; i < this.game.state.objects.length; i++){
			if(this.game.state.objects[i] == this) continue;
			if(this.state.effect.position.distanceTo(this.game.state.objects[i].cube.position) < 4 + this.state.effect.colRadiusAdd){
				(this.state.effect.position.x < this.game.state.objects[i].cube.position.x) ? 
					this.game.state.objects[i].pushUpdate(2, 30/this.state.effect.colRadiusAdd) :
					this.game.state.objects[i].pushUpdate(1, 30/this.state.effect.colRadiusAdd);
				this.game.playSound('bump');
			}
		}
	}
	// reset game 
	resetGame(){
		this.moveSpeed = 0.5;
		this.toWhite = 0.01;
		this.starSpeed = 0.0625;
		this.state = {
			// 0 or 1 can fire, 2 fired
			// 0 --> 1 back to white
			// 1 --> 0 back to green
			'bar': 1,
			'up':false,
			'down':false,
			// 0 can, 1 left, 2 right, 3 can't move
			'xDir':0,
			'jumpState':{
				// 0 on ground, 1 going up, 2 falling with ground under, 3 falling with no ground under
				'position':0,
				'jumpY':0,
				'jumpSpeed':0.49/2 + 0.49,
			},
			'timer': new THREE.Clock(),
			// for mobile use
			'mouse':{
				x:0,
				y:0,
			},
			'bonk':{
				'dir':0,
				'to':0,
				'obj':null,
			},
			'effect':{
				'colRadiusAdd':0,
				'position': new THREE.Vector3(0,0,0),
			}
		};
		this.origin = {	
			x:-35,
			y:-35,
			z:0,
		};
		this.bar.scale.x = 1;
		this.game.resetGame();
	}
	// update player movement with given keys/actions/touches
	inputUpdate(){
		if(this.game.state.playing == 2) {
			this.resetGame();
			return;
		}
		for(var i = 0; i < this.game.state.objects.length; i++){
			this.checkCollision(this.game.state.objects[i]);
		}
		switch(this.state.xDir){
			case 1:
				this.origin.x -= this.moveSpeed;
				if(this.moveSpeed < 1){
					this.moveSpeed += 0.1;
				}
				break;
			case 2:
				this.origin.x += this.moveSpeed;
				if(this.moveSpeed < 1){
					this.moveSpeed += 0.1;
				}
				break;
			case 3:
				this.state.bonk.to /= 2;
				this.origin.x += this.state.bonk.to;
				this.state.bonk.obj.origin.x -= this.state.bonk.to;
				if(Math.abs(this.state.bonk.to) < 0.2){
					this.state.xDir = 0;
				}
				break;
			default:
				break;
		}
		if(this.game.floorCheck(this)){
			this.state.jumpState.position = 3;
		}
		switch(this.state.jumpState.position){
			case 0:
				break;
			case 1:
				this.origin.y += this.state.jumpState.jumpSpeed;
				if(this.origin.y > this.state.jumpState.jumpY){
					this.state.jumpState.position = 2;
				}
				break;
			case 2:
				this.origin.y -= this.state.jumpState.jumpSpeed;
				if(this.origin.y < this.state.jumpState.jumpY - 10){
					this.origin.y = this.game.resetPos.y;
					this.state.jumpState.position = 0;
				}
				break;
			case 3:
				this.origin.y -= this.state.jumpState.jumpSpeed;
				if(this.origin.y < this.game.resetPos.y - 10){
					this.game.state.GOmsg = "You scored: " + this.game.state.score + "<br>You fell off!"
					this.game.state.score = 0;
					this.game.state.playing = 2;
					this.origin.x = this.game.resetPos.x, this.origin.y = this.game.resetPos.y;
					this.state.jumpState.position = 0;
				}
			default:
				break;
		}
	}
	
	// updates bar which indicates when line effect can be used
	updateBar(){
		this.bar.position.set(this.origin.x, this.origin.y - 2, this.origin.z);
		if(this.game.state.playing == 2) return;
		if(this.state.timer.running) this.bar.scale.x = this.state.timer.getElapsedTime()/5;
		else{
			switch(this.state.bar){
				case 0:
					this.bar.material.color.lerp(new THREE.Color(1,1,1), this.toWhite * 10);
					if(this.bar.material.color.r > 0.9) this.state.bar = 1;
					break;
				case 1:
					this.bar.material.color.lerp(new THREE.Color(0,1,0), this.toWhite * 10);
					if(this.bar.material.color.r < 0.25) this.state.bar = 0;
					break;
				case 2:
					this.bar.material.color.setScalar(1);
					break;
				default:
					break;
			}
		}
	}
	
	// update player 
	update(){
		this.inputUpdate();
		this.updateBar();
		this.updateLine();
		this.checkExplosionPush();
		this.cube.position.set(this.origin.x,this.origin.y, this.origin.z);
	}
}
class Game{
	constructor(w){
		this.multiplier = 0.1;
		this.state = {
			// 0 game not started, 1 playing, 2 died
			playing:0,
			GOmsg:"",
			objects:[],
			score:0,
			makeObj:10,
			floor:{
				original:100,
				size:100,
				subtract:10,
				oscillate:0.01,
				timer: new THREE.Clock(false),
			},
			sounds:{
				isMuted:false,
				bg:{
					src:'',
					obj:null,
				},
				breakFloor:{
					src:'',
				},
				explosion:{
					src:'',
				},
				jump:{
					src:'',
				},
				bump:{
					src:'',
				},
			}
		};
		this.resetPos = {	
			x:-35,
			y:-35,
			z:0,
		};

		
		this.gameOver = document.getElementById('dead');
		this.soundBtn = document.getElementById('pauseplay');
		Game.uiAdjust(this.soundBtn);
		
		this.scene = new THREE.Scene();
		this.camera = new THREE.PerspectiveCamera(
			45,
			window.innerWidth / window.innerHeight,
			1,
			750);
			
		this.camera.position.set(0,0,100);
		this.camera.lookAt(new THREE.Vector3(0,0,0));
		
		
		this.renderer = new THREE.WebGLRenderer();
		this.renderer.setSize(window.innerWidth, window.innerHeight);
		this.renderer.domElement.id = 'getHeight';
		document.body.appendChild(this.renderer.domElement);
		
		// floor
		this.floorGeometry = new THREE.BoxGeometry(this.state.floor.original, 1, 1);
		this.floorColor = new THREE.Color(1,1,1);
		this.floorMaterial = new THREE.MeshBasicMaterial({color:this.floorColor});
		this.floor = new THREE.Mesh(this.floorGeometry, this.floorMaterial);
		this.floor.position.set(this.resetPos.x, this.resetPos.y - 1, this.resetPos.z -1);
		this.scene.add(this.floor);
		
		
		// add player 
		this.player = new Player(this);
		this.state.objects.push(this.player);
		this.player.setListeners(this.player, w);
		
		// add any stationary objects
		this.object = new GameObject(this);
		this.state.objects.push(this.object);

		this.setListeners(this,w);
	}
	loadAudio(src, type){
		this.state.sounds[type].src = src;
	}
	startUpSounds(){
		this.listener = new THREE.AudioListener();
		this.camera.add(this.listener);
		
		var s = new THREE.Audio(this.listener);
		var audioLoader = new THREE.AudioLoader();
		audioLoader.load(this.state.sounds.bg.src, function(buffer){
			s.setBuffer(buffer);
			s.setLoop(true);
			s.setVolume(0.75);
			s.play();
		});
		this.state.sounds.bg.obj = s;
	}
	playSound(type,isBG=false){
		if(this.state.sounds.isMuted) return;
		var s = new THREE.Audio(this.listener);
		var audioLoader = new THREE.AudioLoader();
		audioLoader.load(this.state.sounds[type].src, function(buffer){
			s.setBuffer(buffer);
			s.setLoop(false);
			s.setVolume(0.5);
			s.play();
		});
	}
	updateUI(){
		if(this.scoreDisplay == undefined){
			this.scoreDisplay = document.getElementById('scoreDisplay');
			Game.uiAdjust(this.scoreDisplay);
		}
		this.scoreDisplay.innerHTML = "Score:<br>" + this.state.score;
		switch(this.state.playing){
			case 0:
				(Game.mobileCheck()) ? this.gameOver.innerHTML = "Touch here to play!" :
					this.gameOver.innerHTML = "Click here to play!";
				Game.uiAdjust(this.gameOver);
				break;
			case 1:
				this.gameOver.innerHTML = "";
				break;
			case 2:
				(Game.mobileCheck()) ? this.gameOver.innerHTML = this.state.GOmsg + "<br>Touch here to start again." :
										this.gameOver.innerHTML = this.state.GOmsg + "<br>Press Q to start again.";
				Game.uiAdjust(this.gameOver);
				break;
			default:
				break;
		}
	}
	setListeners(o,w){
		w.addEventListener('resize', function() {
			o.camera.aspect = w.innerWidth / w.innerHeight;
			o.camera.updateProjectionMatrix();
			o.renderer.setSize(w.innerWidth, w.innerHeight);
			Game.uiAdjust(o.soundBtn);
		});
		window.addEventListener('visibilitychange', function(){
			if(document.visibilityState == 'hidden' && 
				o.state.sounds.bg.obj != null){
				o.state.sounds.isMuted = true;
				o.state.sounds.bg.obj.setVolume(0);
				(o.state.sounds.isMuted) ? document.getElementById('pauseplay').innerHTML = "<span class='glyphicon glyphicon-volume-off' aria-hidden='true'></span>" :
					document.getElementById('pauseplay').innerHTML = "<span class='glyphicon glyphicon-volume-up' aria-hidden='true'></span>";
			}
		});
		window.addEventListener('mozvisibilitychange', function(){
			if(document.visibilityState == 'mozHidden' && 
				o.state.sounds.bg.obj != null){
				o.state.sounds.isMuted = true;
				o.state.sounds.bg.obj.setVolume(0);
				(o.state.sounds.isMuted) ? document.getElementById('pauseplay').innerHTML = "<span class='glyphicon glyphicon-volume-off' aria-hidden='true'></span>" :
					document.getElementById('pauseplay').innerHTML = "<span class='glyphicon glyphicon-volume-up' aria-hidden='true'></span>";
			}
		});
		window.addEventListener('webkitvisibilitychange', function(){
			if(document.visibilityState == 'webkitHidden' && 
				o.state.sounds.bg.obj != null){
				o.state.sounds.isMuted = true;
				o.state.sounds.bg.obj.setVolume(0);
				(o.state.sounds.isMuted) ? document.getElementById('pauseplay').innerHTML = "<span class='glyphicon glyphicon-volume-off' aria-hidden='true'></span>" :
					document.getElementById('pauseplay').innerHTML = "<span class='glyphicon glyphicon-volume-up' aria-hidden='true'></span>";
			}
		});
		window.addEventListener('msvisibilitychange', function(){
			if(document.visibilityState == 'msHidden' && 
				o.state.sounds.bg.obj != null){
				o.state.sounds.isMuted = true;
				o.state.sounds.bg.obj.setVolume(0);
				(o.state.sounds.isMuted) ? document.getElementById('pauseplay').innerHTML = "<span class='glyphicon glyphicon-volume-off' aria-hidden='true'></span>" :
					document.getElementById('pauseplay').innerHTML = "<span class='glyphicon glyphicon-volume-up' aria-hidden='true'></span>";
			}
		});
		window.addEventListener('blur', function(){ 
			if(o.state.sounds.bg.obj == null) return;
			o.state.sounds.isMuted = true;
			o.state.sounds.bg.obj.setVolume(0);
			(o.state.sounds.isMuted) ? document.getElementById('pauseplay').innerHTML = "<span class='glyphicon glyphicon-volume-off' aria-hidden='true'></span>" :
				document.getElementById('pauseplay').innerHTML = "<span class='glyphicon glyphicon-volume-up' aria-hidden='true'></span>";
		});
		document.getElementById('pauseplay').addEventListener('click',function(e){
			o.state.sounds.isMuted = !o.state.sounds.isMuted;
			(o.state.sounds.isMuted) ? document.getElementById('pauseplay').innerHTML = "<span class='glyphicon glyphicon-volume-off' aria-hidden='true'></span>" :
				document.getElementById('pauseplay').innerHTML = "<span class='glyphicon glyphicon-volume-up' aria-hidden='true'></span>";
		});
	}
	createNewObject(){
		if(this.state.score > this.state.makeObj){
			this.state.objects.push(new GameObject(this));
			this.state.makeObj = this.state.score + 10;
		}
	}
	floorCheck(obj){
		// not on floor
		if(obj.origin.x < this.resetPos.x - this.state.floor.size/2 ||
			obj.origin.x > this.resetPos.x + this.state.floor.size/2) return true;
		// on floor
		return false;
	}
	floorBreak(){
		this.playSound('breakFloor');
		this.state.floor.size -= this.state.floor.subtract;
		this.floor.scale.x -= this.state.floor.subtract/100;
		if(this.floor.scale.x < 0.2) {
			this.state.playing = 2;
			this.state.GOmsg = "You scored: " + this.state.score + "<br>before the floor gave up!";
		}
		this.state.floor.timer.start();
	}
	resetGame(){
		this.state.makeObj = 10;
		this.state.floor.size = this.state.floor.original;
		this.floor.scale.x = 1;
		this.floor.material.color.setScalar(1);
		for(var i = 2; i < this.state.objects.length; i++){
			this.scene.remove(this.state.objects[i].cube);
		}
		this.state.objects.length = 2;
	}
	//updates floor color red to white to red to white
	updateFloor(){
		if(!this.state.floor.timer.running) return;
		var t = Math.floor(this.state.floor.timer.getElapsedTime());
		if(t % 2 == 0) {
			this.floor.material.color.g -= this.state.floor.oscillate;
			this.floor.material.color.b -= this.state.floor.oscillate;
		}else{
			this.floor.material.color.g += this.state.floor.oscillate;
			this.floor.material.color.b += this.state.floor.oscillate;
		}
		if(this.state.floor.timer.getElapsedTime() > 4) this.state.floor.timer.stop();
	}
	// toggle sounds 
	toggleSound(){
		if (this.state.sounds.bg.obj == null) return 
		(this.state.sounds.isMuted) ? this.state.sounds.bg.obj.setVolume(0) :
			this.state.sounds.bg.obj.setVolume(0.75);
	}
	 /*************************************************
		Static functions
	 **************************************************/
	 //https://discourse.threejs.org/t/functions-to-calculate-the-visible-width-height-at-a-given-z-depth-from-a-perspective-camera/269
	 static visibleWidthAtZDepth( depth, camera ){
		const height = Game.visibleHeightAtZDepth( depth, camera );
		return height * camera.aspect;
	}
	static visibleHeightAtZDepth( depth, camera ) {
		// compensate for cameras not positioned at z=0
		const cameraOffset = camera.position.z;
		if ( depth < cameraOffset ) depth -= cameraOffset;
		else depth += cameraOffset;

		// vertical fov in radians
		const vFOV = camera.fov * Math.PI / 180; 

		// Math.abs to ensure the result is always positive
		return 2 * Math.tan( vFOV / 2 ) * Math.abs( depth );
	}
	
	//https://stackoverflow.com/questions/1527803/generating-random-whole-numbers-in-javascript-in-a-specific-range
	static getRandomInt(min, max) {
		return Math.floor(Math.random() * (max - min + 1)) + min;
	}
	static normalize(value, start, end){
		return (value - start)/(end-start);
	}
	static uiAdjust(elem){
		switch(elem.id){
			case 'scoreDisplay':
				if( /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) ) {
					elem.style.left = "5%";
				}
				break;
			case 'dead':
				if( !(/Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent)) ) {
					elem.style.fontSize = "300%";
				}
				elem.style.left = document.body.clientWidth/2 - elem.clientWidth/2 + "px";
				elem.style.top = "15%";
				break;
			case 'pauseplay':
				elem.style.top = window.innerHeight - elem.clientHeight* 2 - 20 +"px";
				elem.style.left = document.body.clientWidth/2 - elem.clientWidth/2 + "px";
				break;
			default:
				break;
		}
	}
	static mobileCheck(){
		if( /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) ) return true;
		return false;
	}

	//main loop
	animate(){
		for(var i = 0; i < this.state.objects.length; i++){
			this.state.objects[i].update();
		}
		this.updateUI();
		this.createNewObject();
		this.updateFloor();
		this.toggleSound();
		this.camera.position.set(this.player.origin.x,this.player.origin.y, this.player.origin.z + 100);
		requestAnimationFrame(this.animate.bind(this));
		this.renderer.render(this.scene, this.camera);
	}
}
var g = new Game(window);
