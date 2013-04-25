'use strict';
if (window.global_splitochrome) {
	console.log("Split O' Chrome already loaded");
}
else {
	console.log("Loading Split O' Chrome");
	String.prototype.trim = String.prototype.trim || function() {
		return this.replace(/^\s+|\s+$/g, '');
	};
	var splitochrome = {
		CIRCUITS : undefined,
		PARENT : undefined,
		OURDIV : undefined,
		BACKUP : undefined,
		RE_CIRCUIT : /^\S+/,
		HEADLINE : {},
		onRunnerClicked : function(event) {
			if (this.classList.contains('selected')) {
				this.classList.remove('selected');
			} else {
				this.classList.add('selected');
			}
		},
		onIconClicked : function() {
			if (splitochrome.OURDIV) {
				console.log("Split O' Chrome reverting to original");
				splitochrome.PARENT.removeChild(splitochrome.OURDIV);
				splitochrome.PARENT.appendChild(splitochrome.BACKUP);
				splitochrome.OURDIV = null;
			} else {
				console.log("Split O' Chrome showing tables");
				splitochrome.PARENT.removeChild(splitochrome.BACKUP);
				splitochrome.OURDIV = document.createElement('div');
				splitochrome.OURDIV.id = 'splitochrome';
				for ( var i = 0; i < splitochrome.CIRCUITS.length; i++) {
					var c = splitochrome.CIRCUITS[i];
					var table = document.createElement('table');
					var tbody, th, tr, td = undefined;
					table.createCaption().innerText = c.description;
					var thead = table.createTHead();

					th = document.createElement('th');
					th.innerText = "#";
					th.classList.add('right');
					thead.appendChild(th);

					th = document.createElement('th');
					th.innerText = "Name";
					th.classList.add('left');
					thead.appendChild(th);

					th = document.createElement('th');
					th.innerText = "Cat.";
					th.classList.add('left');
					thead.appendChild(th);

					for ( var j = 0; j < c.controls.length; j++) {
						th = document.createElement('th');
						th.innerText = c.controls[j].n;
						th.classList.add('right');
						thead.appendChild(th);
					}
					for ( var r = 0; r < c.runners.length; r++) {
						var runner = c.runners[r];
						tbody = table.createTBody();
						tbody.addEventListener('click',
								splitochrome.onRunnerClicked);
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

						th = document.createElement('th');
						th.innerText = runner.category;
						th.classList.add('left');
						tr.appendChild(th);

						// leg
						for ( var t = 0; t < c.controls.length; t++) {
							td = document.createElement('td');
							td.innerText = runner.legTimes[t];
							td.classList.add('right');
							tr.appendChild(td);
						}
						// cumulated
						tr = document.createElement('tr');
						tbody.appendChild(tr);
						for ( var k = 0; k < 3; k++) {
							th = document.createElement('th');
							tr.appendChild(th);
						}
						for ( var t = 0; t < c.controls.length; t++) {
							td = document.createElement('td');
							td.innerText = runner.cumTimes[t];
							td.classList.add('right');
							tr.appendChild(td);
						}
						if (td) {
							td.classList.add('total');
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
			var fullText = splitochrome.BACKUP.innerText;
			var lines = fullText.split(/\n/);
			var head = lines.shift();
			var allCircuits = [];
			splitochrome.HEADLINE.rank = head.indexOf('Pl');
			splitochrome.HEADLINE.name = head.indexOf('Nom');
			splitochrome.HEADLINE.category = head.indexOf('Cat.');
			splitochrome.HEADLINE.time = head.indexOf('Temps')
					- '3:59:59'.length;
			splitochrome.HEADLINE.data = head.indexOf('Temps') + 'Temps'.length;

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
			} while (line !== undefined && !line.match(splitochrome.RE_CIRCUIT));
			if (line !== undefined) {
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
			} while (line);
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
			} while (!line);
			lines.unshift(line);
			// Read runners
			var runner;
			do {
				runner = splitochrome.getOneRunner(circuit.controlLinesCount,
						lines);
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
			runner.rank = line1.slice(splitochrome.HEADLINE.rank,
					splitochrome.HEADLINE.name - 1).trim();
			runner.name = line1.slice(splitochrome.HEADLINE.name,
					splitochrome.HEADLINE.category - 1).trim();
			runner.category = line1.slice(splitochrome.HEADLINE.category,
					splitochrome.HEADLINE.time - 1).trim();
			runner.totalTime = line1.slice(splitochrome.HEADLINE.time,
					splitochrome.HEADLINE.data - 1).trim();

			lines.unshift(line2);
			lines.unshift(line1);

			var totals = "";
			var legs = "";
			var line;
			for ( var i = 0; i < 2 * controlLinesCount; i += 2) {
				line = lines.shift();
				line = line.slice(splitochrome.HEADLINE.data);
				totals += line;
				line = lines.shift();
				line = line.slice(splitochrome.HEADLINE.data);
				legs += line;
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
			console.log("Parsing document found " + splitochrome.CIRCUITS.length + " circuits");
		    chrome.extension.sendMessage({cmd:'parseok', count:splitochrome.CIRCUITS.length });
			break;
		case 'showtables':
			splitochrome.onIconClicked();
			break;
		}

	});
}