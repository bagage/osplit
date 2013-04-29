'use strict';
if (window.osplits) {
	console.log("O'Splits: already loaded");
}
else {
	console.log("O'Splits: loading...");
	String.prototype.trim = String.prototype.trim || function() {
	    return this.replace(/^\s+|\s+$/g, '');
	};
	var osplits = {};
	osplits.util = {
		str2sec: function(tString) {
			if (!tString) {
				return -1;
			}
			else if (tString === '-----') {
				return -2;
			}
			var bits = tString.split(':');
			if (bits.length < 3) {
				bits.unshift('0');
			}
			var sec = 0;
			sec += bits[0] * 3600;
			sec += bits[1] * 60;
			sec += bits[2] * 1; // to int!
			return sec;
		},
		sec2str: function(tSec) {
			if (tSec === -1) {
				return '';
			}
			else if (tSec === -2) {
				return '-----';
			}
			var bits = [];
			bits[2] = parseInt(tSec / 3600);
			tSec %= 3600;
			bits[1] = parseInt(tSec/60);
			tSec %= 60;
			bits[0] = parseInt(tSec);
			var tString = '';
			if (bits[2] > 0) {
				tString += bits[2] + ':';
				if (bits[1] < 10) {
					tString += '0';
				}
			}
			tString += bits[1] + ':';
			if (bits[0] < 10) {
				tString += '0';
			}
			tString += bits[0];
			return tString;
		}
	},
	osplits.webdb = {
		db: null,
		open : function() {
			var dbSize = 5 * 1024 * 1024; // 5MB
			osplits.webdb.db = openDatabase("osplits", "1.0", "O'Splits Storage", dbSize);
		},
		onError : function(tx, e) {
			console.error("O'Splits: insertione failed: " + e);
		},
		createTables : function() {
			osplits.webdb.db.transaction(function(tx) {
				tx.executeSql("DROP TABLE IF EXISTS time");
				tx.executeSql("DROP TABLE IF EXISTS runner");
				tx.executeSql("DROP TABLE IF EXISTS circuit");
			    tx.executeSql("CREATE TABLE IF NOT EXISTS circuit(id INTEGER PRIMARY KEY ASC, number INTEGER, description TEXT, ctrlCount INTEGER)", []);
			    tx.executeSql("CREATE TABLE IF NOT EXISTS runner(id INTEGER PRIMARY KEY ASC, circuitId INTEGER, name TEXT, club TEXT, category TEXT)", []);
			    tx.executeSql("CREATE TABLE IF NOT EXISTS time(id INTEGER PRIMARY KEY ASC, circuitId INTEGER, runnerId INTEGER, numInCircuit INTEGER, fromCtrl TEXT, toCtrl TEXT, legSec INTEGER, cumSec INTEGER)", []);
			});
		},
		storeCircuitTxn: function(number, circuit) {
			var noop = function(){};
			var storeCircuit = function(tx) {
				tx.executeSql("INSERT INTO circuit(number, description, ctrlCount) VALUES (?,?,?)", [number, circuit.description, circuit.controls.length - 1],
				        function(txdummy, result){
							for(var i=0; i<circuit.runners.length;i++) {
								storeRunner(tx, result.insertId, circuit.runners[i]);
							}
						}, osplits.webdb.onError);
			};
			var storeRunner = function(tx, circuitId, runner) {
				tx.executeSql("INSERT INTO runner(circuitId, name, club, category) VALUES (?,?,?,?)", [circuitId, runner.name, runner.club, runner.category],
				        function(txdummy, result){
							var fromCtrl = 'D';
							for(var i=0; i<circuit.controls.length;i++) {
								var legSec = osplits.util.str2sec(runner.legTimes[i]);
								var cumSec = osplits.util.str2sec(runner.cumTimes[i]);
								var toCtrl = circuit.controls[i].id;
								var numInCircuit = circuit.controls[i].n;
								storeTime(tx, circuitId, result.insertId, numInCircuit, fromCtrl, toCtrl, legSec, cumSec);
								fromCtrl = toCtrl;
							}
						}, osplits.webdb.onError);				
			};
			var storeTime = function(tx, circuitId, runnerId, numInCircuit, fromCtrl, toCtrl, legSec, cumSec) {
				tx.executeSql("INSERT INTO time(circuitId, runnerId, numInCircuit, fromCtrl, toCtrl, legSec, cumSec) VALUES (?,?,?,?,?,?,?)",
						[circuitId, runnerId, numInCircuit, fromCtrl, toCtrl, legSec, cumSec], noop, osplits.webdb.onError);
			};
			osplits.webdb.db.transaction(function(tx) {
				storeCircuit(tx);
			});
		}
	};
	osplits.webdb.open();
	osplits.webdb.createTables();
	osplits.parser = {
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
		Extractor: function(from,to){
		    this.from = from;
		    this.to = to;
		},
		parseDocument : function() {
			osplits.parser.BACKUP = document.getElementsByTagName('pre')[0];
			osplits.parser.PARENT = osplits.parser.BACKUP.parentElement;
			osplits.parser.LANG = osplits.parser.LANGS.fr;
			var fullText = osplits.parser.BACKUP.innerText;
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
                return new osplits.parser.Extractor(from, to);
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
                return new osplits.parser.Extractor(from, to);
            };  
			osplits.parser.HEADLINE.rank = extractRightAligned(osplits.parser.LANG.rank, 2);
			osplits.parser.HEADLINE.name = extractLeftAligned(osplits.parser.LANG.name);
			osplits.parser.HEADLINE.category = extractLeftAligned(osplits.parser.LANG.category, 4);
			osplits.parser.HEADLINE.time = extractRightAligned(osplits.parser.LANG.time, '3:59:59'.length);
			osplits.parser.HEADLINE.data = new osplits.parser.Extractor(osplits.parser.HEADLINE.time.to + 1);

			osplits.parser.dropNonCircuit(lines);
			while (lines.length > 0) {
				var circuit = osplits.parser.getOneCircuit(lines);
				if (circuit){
    				allCircuits.push(circuit);
    				osplits.webdb.storeCircuitTxn(allCircuits.length, circuit);
				}
			}
			return allCircuits;
		},

		dropNonCircuit : function(lines) {
			var line;
			do {
				line = lines.shift();
			} while (lines.length > 0 && !line.match(osplits.parser.RE_CIRCUIT));
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
			if (circuit.controls.length === 0){
			    console.log('Not a split times circuit: ' + circuit.description);
			    osplits.parser.dropNonCircuit(lines);
			    return undefined;
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
				runner = osplits.parser.getOneRunner(circuit.controlLinesCount, lines);
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
			runner.rank = osplits.parser.HEADLINE.rank && osplits.parser.HEADLINE.rank.extract(line1) || '';
			runner.name = osplits.parser.HEADLINE.name && osplits.parser.HEADLINE.name.extract(line1) || '';
			runner.category = osplits.parser.HEADLINE.category && osplits.parser.HEADLINE.category.extract(line1) || '';
			runner.club = osplits.parser.HEADLINE.name && osplits.parser.HEADLINE.name.extract(line2) || '';
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
				line = osplits.parser.HEADLINE.data.extract(line);
				totals += ' ' + line;
				line = lines.shift();
                line = osplits.parser.HEADLINE.data.extract(line);
				legs += ' ' + line;
			}
			do {
			    line = lines.shift();
			} while(lines.length > 0 && line && !line.match(osplits.parser.RE_CIRCUIT) && !osplits.parser.HEADLINE.rank.extract(line))
			if (line) {
			    lines.unshift(line);
			}

			runner.cumTimes = totals.trim().split(/\s+/);
			runner.legTimes = legs.trim().split(/\s+/);
			return runner;
		}
	};
	osplits.parser.Extractor.prototype.extract = function(s) {
	    var tmp = s.slice(this.from, this.to);
	    return tmp.trim();
	},
	osplits.tables = {
			onRunnerClicked : function(event) {
	            var tbody = this;
	            var table = tbody.parentElement;
	            if (!table.classList.contains('restricted')) {
	    			if (tbody.classList.contains('selected')) {
	    			    tbody.classList.remove('selected');
	    			} else {
	    			    tbody.classList.add('selected');
	    			}
	            }
			},
			toggleRestricted: function(event) {
			    var button = this;
				var table = button.parentElement.parentElement;
				if (table.classList.contains('restricted')) {
				    $(table).find('tbody').show('fast', function(){
				        table.classList.remove('restricted');
				        button.innerText = chrome.i18n.getMessage('buttonFilterOn');
				    });
				}
				else{
					$(table).find('tbody').not('.selected').hide(function(){
					    table.classList.add('restricted');
					    button.innerText = chrome.i18n.getMessage('buttonFilterOff');
					});
				}
			},
			toggleDisplay : function() {
				if (osplits.parser.OURDIV) {
					console.log("O'Splits: reverting to original");
					osplits.parser.PARENT.removeChild(osplits.parser.OURDIV);
					osplits.parser.PARENT.appendChild(osplits.parser.BACKUP);
					osplits.parser.OURDIV = null;
				} else {
					console.log("O'Splits: showing tables");
					osplits.parser.PARENT.removeChild(osplits.parser.BACKUP);
					osplits.tables.generateTables();
					osplits.parser.PARENT.appendChild(osplits.parser.OURDIV);
				}
			},
			generateTables : function() {
                osplits.parser.OURDIV = document.createElement('div');
                osplits.parser.OURDIV.id = 'osplits';
                for ( var i = 0; i < osplits.parser.CIRCUITS.length; i++) {
                    var c = osplits.parser.CIRCUITS[i];
                    var table = document.createElement('table');
                    var tbody, th, tr, td = undefined;
                    var caption = table.createCaption();
                    caption.innerText = c.description;
                    var button = document.createElement('button');
                    button.innerText = chrome.i18n.getMessage('buttonFilterOn');
                    button.addEventListener('click', osplits.tables.toggleRestricted);
                    caption.appendChild(button);
                    var thead = table.createTHead();

                    th = document.createElement('th');
                    th.innerText = chrome.i18n.getMessage('labelRank');
                    th.classList.add('right');
                    thead.appendChild(th);

                    th = document.createElement('th');
                    th.innerText = chrome.i18n.getMessage('labelName');
                    th.classList.add('left');
                    thead.appendChild(th);
                    
                    if (osplits.parser.HEADLINE.category) { 
                        th = document.createElement('th');
                        th.innerText = chrome.i18n.getMessage('labelCategory');
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
                        tbody.addEventListener('click', osplits.tables.onRunnerClicked);
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

                        if (osplits.parser.HEADLINE.category) { 
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
                        if (c.controls.length) {
                            td.classList.add('last');
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
                        if (osplits.parser.HEADLINE.category) { 
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
                        if (c.controls.length) {
                            td.classList.add('last');
                        }
                    }
                    osplits.parser.OURDIV.appendChild(table);
                }			    
			}
	};
	window.osplits = osplits;
	chrome.runtime.onMessage.addListener(function(msg) {
		switch (msg.cmd) {
		case 'parse':
			osplits.parser.CIRCUITS = osplits.parser.parseDocument();
			console.log("O'Splits: Parsing document found " + osplits.parser.CIRCUITS.length + " circuits");
		    chrome.extension.sendMessage({cmd:'parseok', count:osplits.parser.CIRCUITS.length });
			break;
		case 'showtables':
			osplits.tables.toggleDisplay();
			break;
		}

	});
}