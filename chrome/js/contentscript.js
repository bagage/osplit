'use strict';
String.prototype.trim = String.prototype.trim || function() {
    return this.replace(/^\s+|\s+$/g, '');
};
function Extractor(from,to){
    this.from = from;
    this.to = to;
};
Extractor.prototype.extract = function(s) {
    var tmp = s.slice(this.from, this.to);
    return tmp.trim();
};
if (window.global_splitochrome) {
	console.log("O'Splits: already loaded");
}
else {
	console.log("O'Splits: loading...");
	var splitochrome = {
		CIRCUITS : undefined,
		PARENT : undefined,
		OURDIV : undefined,
		BACKUP : undefined,
		LANGS: {
		    fr: {
		        rank:'Pl',
		        name:'Nom',
		        category:'Cat.',
		        time: 'Temps'
		    }
		},
		LANG:undefined,
		RE_CIRCUIT : /^\S+/,
		HEADLINE : {},
		onRunnerClicked : function(event) {
			if (this.classList.contains('selected')) {
				this.classList.remove('selected');
			} else {
				this.classList.add('selected');
			}
		},
		toggleRestricted: function(event) {
		    var button = this;
			var table = button.parentElement.parentElement;
			if (table.classList.contains('restricted')) {
				table.classList.remove('restricted');
				button.innerText = "View only selected";
			}
			else{
				table.classList.add('restricted');
				button.innerText = "Remove filter";
			}
		},
		generateTables : function() {
			if (splitochrome.OURDIV) {
				console.log("O'Splits: reverting to original");
				splitochrome.PARENT.removeChild(splitochrome.OURDIV);
				splitochrome.PARENT.appendChild(splitochrome.BACKUP);
				splitochrome.OURDIV = null;
			} else {
				console.log("O'Splits: showing tables");
				splitochrome.PARENT.removeChild(splitochrome.BACKUP);
				splitochrome.OURDIV = document.createElement('div');
				splitochrome.OURDIV.id = 'splitochrome';
				for ( var i = 0; i < splitochrome.CIRCUITS.length; i++) {
					var c = splitochrome.CIRCUITS[i];
					var table = document.createElement('table');
					var tbody, th, tr, td = undefined;
					var caption = table.createCaption();
					caption.innerText = c.description;
					var button = document.createElement('button');
					button.innerText = "View only selected";
					button.addEventListener('click', splitochrome.toggleRestricted);
					caption.appendChild(button);
					var thead = table.createTHead();

					th = document.createElement('th');
					th.innerText = "#";
					th.classList.add('right');
					thead.appendChild(th);

					th = document.createElement('th');
					th.innerText = "Name";
					th.classList.add('left');
					thead.appendChild(th);
					
					if (splitochrome.HEADLINE.category) { 
    					th = document.createElement('th');
    					th.innerText = "Cat.";
    					th.classList.add('left');
    					thead.appendChild(th);
					}
					for ( var j = 0; j < c.controls.length; j++) {
						th = document.createElement('th');
						th.innerHTML = c.controls[j].n + '&nbsp;<span class="ctrlid">' + c.controls[j].id + '</span>';
						th.classList.add('right');
						thead.appendChild(th);
					}
					for ( var r = 0; r < c.runners.length; r++) {
						var runner = c.runners[r];
						tbody = table.createTBody();
						tbody.addEventListener('click', splitochrome.onRunnerClicked);
						tr = document.createElement('tr');
						tbody.appendChild(tr);

						th = document.createElement('th');
						th.innerText = r + 1;
						th.classList.add('right');
						tr.appendChild(th);

						th = document.createElement('th');
						th.innerText = runner.name;
						th.classList.add('left');
						tr.appendChild(th);

						if (splitochrome.HEADLINE.category) { 
    						th = document.createElement('th');
    						th.innerText = runner.category;
    						th.classList.add('left');
    						tr.appendChild(th);
						}
						// leg
						for ( var t = 0; t < c.controls.length; t++) {
							td = document.createElement('td');
							td.innerText = runner.legTimes[t] || '-----';
							td.classList.add('right');
							td.title = runner.name + " @ " + c.controls[t].n;
							tr.appendChild(td);
						}
						// cumulated
						tr = document.createElement('tr');
						tbody.appendChild(tr);
						// place holder for rank
						th = document.createElement('th');
						tr.appendChild(th);
						th = document.createElement('th');
						th.innerText = runner.club;
						th.classList.add('club');
						th.classList.add('left');
						tr.appendChild(th);
                        // place holder for category
						if (splitochrome.HEADLINE.category) { 
						    th = document.createElement('th');
						    tr.appendChild(th);
						}
						for ( var t = 0; t < c.controls.length; t++) {
							td = document.createElement('td');
							td.innerText = runner.cumTimes[t] || '-----';
							td.classList.add('right');
							td.title = runner.name + " @ " + c.controls[t].n;
							tr.appendChild(td);
						}
					}
					splitochrome.OURDIV.appendChild(table);
				}
				splitochrome.PARENT.appendChild(splitochrome.OURDIV);
			}

		},
		parseDocument : function() {
			splitochrome.BACKUP = document.getElementsByTagName('pre')[0];
			splitochrome.PARENT = splitochrome.BACKUP.parentElement;
			splitochrome.LANG = splitochrome.LANGS.fr;
			var fullText = splitochrome.BACKUP.innerText;
			var lines = fullText.split(/\n/);
			var head = lines.shift();
			var allCircuits = [];
			var extractLeftAligned = function(tt){
                var from = head.indexOf(tt);
                if (from === -1){
                    return undefined;
                }
                var to = head.slice(from+tt.length).search(/\S/);
                to += from;
                return new Extractor(from, to);
            };  
            var extractRightAligned = function(tt, len){
                var to = head.indexOf(tt);
                if (to === -1){
                    return undefined;
                }
                to += tt.length;
                var from = to -len;
                if (from < 0) {
                    from = 0;
                }
                return new Extractor(from, to);
            };  
			splitochrome.HEADLINE.rank = extractRightAligned(splitochrome.LANG.rank, 2);
			splitochrome.HEADLINE.name = extractLeftAligned(splitochrome.LANG.name);
			splitochrome.HEADLINE.category = extractLeftAligned(splitochrome.LANG.category, 4);
			splitochrome.HEADLINE.time = extractRightAligned(splitochrome.LANG.time, '3:59:59'.length);
			splitochrome.HEADLINE.data = new Extractor(splitochrome.HEADLINE.time.to + 1);

			splitochrome.dropNonCircuit(lines);
			while (lines.length > 0) {
				var circuit = splitochrome.getOneCircuit(lines);
				allCircuits.push(circuit);
				splitochrome.dropNonCircuit(lines);
			}
			return allCircuits;
		},

		dropNonCircuit : function(lines) {
			var line;
			do {
				line = lines.shift();
			} while (lines.length > 0 && !line.match(splitochrome.RE_CIRCUIT));
			if (lines.length > 0) {
			    lines.unshift(line);
			}
		},

		getOneCircuit : function(lines) {
			var line;
			var circuit = {};
			circuit.description = lines.shift();
			circuit.controls = [];
			circuit.runners = [];
			circuit.controlLinesCount = 0;
			var controls = "";
			do {
				line = lines.shift();
				if (line) {
					controls += line;
					circuit.controlLinesCount++;
				}
			} while (lines.length > 0 && line);
			var tmpResultsArr;
			var reControls = /(\d+)\((\d+)\)/g;
			while ((tmpResultsArr = reControls.exec(controls)) !== null) {
				var controlNumber = tmpResultsArr[1];
				var controlId = tmpResultsArr[2];
				circuit.controls.push({
					n : controlNumber,
					id : controlId
				});
			}
			circuit.controls.push({
				n : 'A',
				id : 'A'
			});
			// skip empty line(s)
			do {
				line = lines.shift();
			} while (lines.length > 0 && !line);
			lines.unshift(line);
			// Read runners
			var runner;
			do {
				runner = splitochrome.getOneRunner(circuit.controlLinesCount, lines);
				if (runner) {
					circuit.runners.push(runner);
				}
			} while (runner);
			return circuit;
		},
		getOneRunner : function(controlLinesCount, lines) {
			var line1 = lines.shift();
			if (!line1) {
				return undefined;
			}
			var line2 = lines.shift();
			var runner = {};
			runner.rank = splitochrome.HEADLINE.rank && splitochrome.HEADLINE.rank.extract(line1) || '';
			runner.name = splitochrome.HEADLINE.name && splitochrome.HEADLINE.name.extract(line1) || '';
			runner.category = splitochrome.HEADLINE.category && splitochrome.HEADLINE.category.extract(line1) || '';
			runner.club = splitochrome.HEADLINE.name && splitochrome.HEADLINE.name.extract(line2) || '';
			if (!runner.rank) {
			    return undefined;
			}
			    
			lines.unshift(line2);
			lines.unshift(line1);

			var totals = "";
			var legs = "";
			var line;
			for (var i = 0; i < controlLinesCount; i++) {
				line = lines.shift();
				line = splitochrome.HEADLINE.data.extract(line);
				totals += ' ' + line;
				line = lines.shift();
                line = splitochrome.HEADLINE.data.extract(line);
				legs += ' ' + line;
			}
			do {
			    line = lines.shift();
			} while(lines.length > 0 && line && !line.match(splitochrome.RE_CIRCUIT) && !splitochrome.HEADLINE.rank.extract(line))
			if (line) {
			    lines.unshift(line);
			}

			runner.cumTimes = totals.trim().split(/\s+/);
			runner.legTimes = legs.trim().split(/\s+/);
			return runner;
		}
	};
	window.global_splitochrome = splitochrome;
	chrome.runtime.onMessage.addListener(function(msg) {
		switch (msg.cmd) {
		case 'parse':
			splitochrome.CIRCUITS = splitochrome.parseDocument();
			console.log("O'Splits: Parsing document found " + splitochrome.CIRCUITS.length + " circuits");
		    chrome.extension.sendMessage({cmd:'parseok', count:splitochrome.CIRCUITS.length });
			break;
		case 'showtables':
			splitochrome.generateTables();
			break;
		}

	});
}