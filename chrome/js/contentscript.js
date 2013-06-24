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
			    tx.executeSql("CREATE TABLE IF NOT EXISTS circuit(id INTEGER PRIMARY KEY ASC, number INTEGER, description TEXT, ctrlCount INTEGER)");
			    tx.executeSql("CREATE TABLE IF NOT EXISTS runner(id INTEGER PRIMARY KEY ASC, circuitId INTEGER, rank INTEGER, name TEXT, club TEXT, category TEXT)");
			    tx.executeSql("CREATE TABLE IF NOT EXISTS time(id INTEGER PRIMARY KEY ASC, circuitId INTEGER, runnerId INTEGER, numInCircuit INTEGER, fromCtrl TEXT, toCtrl TEXT, legSec INTEGER, cumSec INTEGER)");
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
				tx.executeSql("INSERT INTO runner(circuitId, rank, name, club, category) VALUES (?,?,?,?,?)", [circuitId, runner.rank, runner.name, runner.club, runner.category],
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
        storeJson: function(jsonResults) {
            for(var circuitNum=0; circuitNum < jsonResults.circuits.length; circuitNum++) {
                var fromCircuit = jsonResults.circuits[circuitNum];
                var toCircuit = {};
                toCircuit.number = fromCircuit.circuitNum;
                toCircuit.description = fromCircuit.name;
                toCircuit.controls = [];
                toCircuit.runners = [];
                for (var ctrlIndex=0; ctrlIndex < fromCircuit.rankedRunners[0].controlCodes.length; ctrlIndex++) {
                    var ctrlId = fromCircuit.rankedRunners[0].controlCodes[ctrlIndex];
                    if (fromCircuit.rankedRunners[0].controlCodes[ctrlIndex] === 'F') {
                        break;
                    }
                    toCircuit.controls.push({n:''+ctrlIndex, id:ctrlId});
                }
                toCircuit.controls.push({n:''+toCircuit.controls.length, id:'A'});
                
                for(var runnerNum=0; runnerNum < fromCircuit.rankedRunners.length; runnerNum++) {
                    var fromRunner = fromCircuit.rankedRunners[runnerNum];
                    var toRunner = {};
                    toRunner.rank = fromRunner.rank;
                    toRunner.name = fromRunner.name;
                    toRunner.club = fromRunner.club;
                    toRunner.category = fromRunner.category;
                    toRunner.legTimes = [];
                    toRunner.cumTimes = [];
                    for (var i=0; i<toCircuit.controls.length; i++) {
                        toRunner.legTimes[i] = fromRunner.splitTimes[i];
                        toRunner.cumTimes[i] = fromRunner.cumulatedTimes[i];
                    }
                }
                osplits.webdb.storeCircuitTxn(circuitNum, toCircuit);
            }
            return circuitNum;
        },
        parseDocument : function() {
			osplits.parser.BACKUP = document.getElementsByTagName('pre')[0];
			osplits.parser.PARENT = osplits.parser.BACKUP.parentElement;
			osplits.parser.LANG = osplits.parser.LANGS.fr;
			var fullText = osplits.parser.BACKUP.innerText;
			var lines = fullText.split(/\n/);
			var head = lines.shift();
			var found = 0;
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

			while (lines.length > 0) {
			    osplits.parser.dropNonCircuit(lines);
				var circuit = osplits.parser.getOneCircuit(lines);
				if (circuit){
				    found++;
    				osplits.webdb.storeCircuitTxn(found, circuit);
				}
			}
			return found;
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
            osplits.tables._onRunnerClicked(tbody);
        },
	    _onRunnerClicked : function(tbody, forceSelected) {
            var table = tbody.parentElement;
            var circuitId = table.dataset['circuitId'];
            var runnerId = tbody.dataset['runnerId'];
            var graphObj = osplits.graph.circuits[circuitId];
            
            var show = forceSelected;
            if (forceSelected === undefined) {
                show = tbody.classList.toggle('selected');
            }
            else if (forceSelected) {
                tbody.classList.add('selected');
            }
            else {
                tbody.classList.remove('selected');
            }
            if (show) {
                graphObj.showRunner(runnerId);
            }
            else {
                graphObj.hideRunner(runnerId);
            }
		},
        onClubClicked : function(event) {
            var cell = this;
            var club = cell.innerText;
            var tbody = cell.parentElement.parentElement.parentElement;
            var isSelected = tbody.classList.contains('selected');
            var table = tbody.parentElement;
            var all = $(table).find('th.club:contains(' + club + ')').parent().parent();
            if (isSelected) {
                all = all.reverse();
            }
            all.each(function(index, elem) {
                osplits.tables._onRunnerClicked(elem, !isSelected);
            });
            event.stopPropagation();
        },
        onControlClicked : function(event) {
            
        },		
		toggleRestricted: function(event) {
		    var button = this;
            var table = $(button).parent().parent().find('table').get(0);
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
		_highlightBest: function(table, rowId, query){
            var cicuitId = table.dataset['circuitId'];
            table.dataset['best'] = rowId;
            $(table).find('.highlighted').removeClass('highlighted');
		    osplits.webdb.db.readTransaction(function(tx){
		        tx.executeSql(query, [cicuitId, cicuitId], function(tx, result){
		            var count = result.rows.length;
		            for(var i = 0; i < count; i++) {
		                var best = result.rows.item(i);
		                var jq = 'tbody[data-runner-id="' + best.id + '"] tr[data-time="' + rowId + '"] td[data-ctrl-num="' + best.numInCircuit + '"]';
		                $(table).find(jq).addClass('highlighted');
		            }
		        });
		    });
        },
        QUERY_BEST_LEG: 'SELECT r.id, t1.numInCircuit FROM time AS t1, runner AS r WHERE t1.circuitId = ? AND t1.runnerId = r.id AND t1.legSec = (SELECT min( t2.legSec ) FROM time t2 WHERE t2.numInCircuit = t1.numInCircuit AND t2.circuitId = ? GROUP BY t2.numInCircuit) order by t1.numInCircuit;', 
        QUERY_BEST_CUM: 'SELECT r.id, t1.numInCircuit FROM time AS t1, runner AS r WHERE t1.circuitId = ? AND t1.runnerId = r.id AND t1.cumSec = (SELECT min( t2.cumSec ) FROM time t2 WHERE t2.numInCircuit = t1.numInCircuit AND t2.circuitId = ? GROUP BY t2.numInCircuit) order by t1.numInCircuit;', 
        toggleHighlightBest: function(event) {
            var button = this;
            var table = $(button).parent().parent().find('table').get(0);
            var curr = table.dataset['best'];
            switch (curr) {
            case 'leg':
                button.innerText = chrome.i18n.getMessage('buttonBestLeg');
                osplits.tables._highlightBest(table, 'cum', osplits.tables.QUERY_BEST_CUM);
                break;
            case 'cum':
                button.innerText = chrome.i18n.getMessage('buttonBestCum');
                osplits.tables._highlightBest(table, 'leg', osplits.tables.QUERY_BEST_LEG);
                break;
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
			}
		},
		onCompleted : function() {
		    osplits.parser.PARENT.appendChild(osplits.parser.OURDIV);
		},
		generateOneCircuit : function(tx, isLast, circuit) {
            var container = document.createElement('div');
            container.classList.add('container');
            
            var caption = document.createElement('h1');
            container.appendChild(caption);
            caption.innerText = circuit.description;

            var button = document.createElement('button');
            button.innerText = chrome.i18n.getMessage('buttonFilterOn');
            button.addEventListener('click', osplits.tables.toggleRestricted);
            caption.appendChild(button);
            
            button = document.createElement('button');
            button.innerText = chrome.i18n.getMessage('buttonBestCum');
            button.addEventListener('click', osplits.tables.toggleHighlightBest);
            caption.appendChild(button);

            button = document.createElement('button');
            button.innerText = chrome.i18n.getMessage('buttonShowGraph');
            button.addEventListener('click', osplits.graph.toggleGraph);
            caption.appendChild(button);

            var scrollable = document.createElement('div');
            container.appendChild(scrollable);
            scrollable.classList.add('scrollable');
            
		    var table = document.createElement('table');
		    scrollable.appendChild(table);
            table.dataset['circuitId'] = circuit.id;

            var thead = table.createTHead();

            var th = document.createElement('th');
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
            tx.executeSql('select * from time where circuitId = ? group by numInCircuit;', [circuit.id], function(tx, ctrlResult) {
                if (circuit.ctrlCount + 1 !== ctrlResult.rows.length) {
                    console.error("Control count mismatch!");
                }
                for (var j = 0; j < ctrlResult.rows.length; j++) {
                    var ctrl = ctrlResult.rows.item(j);
                    th = document.createElement('td');
                    th.innerHTML = ctrl.numInCircuit + '&nbsp;<span class="ctrlid">' + ctrl.toCtrl + '</span>';
                    th.classList.add('right');
//                    th.classList.add('clickable');
                    th.addEventListener('click', osplits.tables.onControlClicked);
                    thead.appendChild(th);
                }

                tx.executeSql('select r.id, r.rank, r.name, r.club, r.category, t.numInCircuit, t.legSec, t.cumSec from time as t, runner as r where t.circuitId = ? and t.runnerId = r.id order by r.rank, r.id, t.numInCircuit;', [circuit.id], function(tx, timeResults) {
                    var timeResultsCount = timeResults.rows.length;
                    var ctrlCount = circuit.ctrlCount + 1;
                    for (var k=0; k < timeResultsCount; k += ctrlCount) {
                        var line = timeResults.rows.item(k);
                        var runner = {
                            id: line.id,
                            rank: line.rank,      
                            name: line.name,      
                            club: line.club,      
                            category: line.category,
                            ctrlNum: [],
                            legSec: [],
                            cumSec: []
                        };
                        for(var kk=0; kk < ctrlCount; kk++) {
                            runner.ctrlNum[kk] = timeResults.rows.item(k+kk).numInCircuit;
                            runner.legSec[kk] = timeResults.rows.item(k+kk).legSec;
                            runner.cumSec[kk] = timeResults.rows.item(k+kk).cumSec;
                        }
                        var isRunnerLast = isLast && k === timeResultsCount - ctrlCount;
                        osplits.tables.generateOneRunner(tx, isRunnerLast, table, runner);
                    }
                });
            });
            osplits.parser.OURDIV.appendChild(container);
            osplits.tables._highlightBest(table, 'leg', osplits.tables.QUERY_BEST_LEG);
            osplits.graph.circuits[circuit.id] = osplits.graph.createGraphObject(table);
		},
		generateOneRunner: function(tx, isRunnerLast, table, runner) {
            var tbody, th, tr, td = undefined;
            tbody = table.createTBody();
            tbody.dataset['runnerId'] = runner.id;
            tbody.addEventListener('click', osplits.tables.onRunnerClicked);
            tr = document.createElement('tr');
            tr.dataset['time'] = 'leg';
            tbody.appendChild(tr);

            th = document.createElement('th');
            th.innerText = runner.rank;
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
            for ( var t = 0; t < runner.legSec.length; t++) {
                td = document.createElement('td');
                td.dataset['ctrlNum'] = runner.ctrlNum[t];
                td.innerText = osplits.util.sec2str(runner.legSec[t]);
                td.classList.add('right');
                td.title = runner.name + " @ " + runner.ctrlNum[t];
                tr.appendChild(td);
            }
            if (runner.legSec.length) {
                td.classList.add('last');
            }
            // cumulated
            tr = document.createElement('tr');
            tr.dataset['time'] = 'cum';
            tbody.appendChild(tr);
            th = document.createElement('th');
            var square = document.createElement('div');
            square.classList.add('square');
            square.style.backgroundColor = osplits.graph.getColor(runner.id);
            th.classList.add('right');
            th.appendChild(square);
            tr.appendChild(th);
            th = document.createElement('th');
            var span = document.createElement('span');
            span.innerText = runner.club;
            span.classList.add('clickable');
            span.addEventListener('click', osplits.tables.onClubClicked);
            th.classList.add('club');
            th.classList.add('left');
            th.appendChild(span);
            tr.appendChild(th);
            // place holder for category
            if (osplits.parser.HEADLINE.category) { 
                th = document.createElement('th');
                tr.appendChild(th);
            }
            for ( var t = 0; t < runner.cumSec.length; t++) {
                td = document.createElement('td');
                td.dataset['ctrlNum'] = runner.ctrlNum[t];
                td.innerText = osplits.util.sec2str(runner.cumSec[t]);
                td.classList.add('right');
                td.title = runner.name + " @ " +  runner.ctrlNum[t];
                tr.appendChild(td);
            }
            if (runner.cumSec.length) {
                td.classList.add('last');
                td.classList.add('total');
            }
            if (isRunnerLast){
                osplits.tables.onCompleted();
            }
		},
		generateTables : function() {
            osplits.parser.OURDIV = document.createElement('div');
            osplits.parser.OURDIV.id = 'osplits';
            
            osplits.webdb.db.readTransaction(function(tx){
                tx.executeSql('SELECT * from circuit ORDER BY number;', [], function(tx, result){
                    for(var i = 0; i < result.rows.length; i++) {
                        var circuit = result.rows.item(i);
                        var isLast = i === result.rows.length - 1;
                        osplits.tables.generateOneCircuit(tx, isLast, circuit);
                    }
                });
            });
		}
	};
	osplits.graph = {
        width : 1000,
        height : 500,
        circuits : {},
        getColor : function(i) {
            var hue = [ 0, 40, 110, 190, 240, 300 ];
            var sat = [ 55, 70, 85, 100 ];
            var lum = [ 40, 55, 70 ];
            var turns = parseInt(i / hue.length);
            var h = (hue[i % hue.length] + 10 * turns) % 360;
            var s = sat[turns * i % sat.length];
            var l = lum[turns * i % lum.length];
            return 'hsl(' + h + ',' + s + '%,' + l + '%)';
        },
        createGraphObject : function(table) {
            var circuitId = parseInt(table.dataset.circuitId);
            var bestTotal = 0;
            var worstTotal = 0;
            var totalTimes = {};
            var bestCumSec = [];
            var xAxis = [];
            var runnerPlots = {};
            var getWorst = function() {
                var w = 0;
                for (var rid in runnerPlots) {
                    if (runnerPlots.hasOwnProperty(rid)) {
                        var plot = runnerPlots[rid];
                        var total = totalTimes[rid];
                        if (plot.shown && total > w) {
                            w = total;
                        }
                    }
                }
                return w;
            };
            var graphLayers = document.createElement('div');
            graphLayers.classList.add('graph');
            var backgroundCanvas = document.createElement('canvas');
            graphLayers.appendChild(backgroundCanvas);
            backgroundCanvas.width = osplits.graph.width;
            backgroundCanvas.height = osplits.graph.height;
            var ctx = backgroundCanvas.getContext('2d');
            var seconds2x = function(s) {
                return parseInt(s * osplits.graph.width / bestTotal);
            };
            var seconds2y = function(s) {
                return parseInt(s * osplits.graph.height / (worstTotal - bestTotal));
            };
            var plotRunner = function(runnerId, ctx, timeRows) {
                ctx.strokeStyle = osplits.graph.getColor(runnerId);
                ctx.lineWidth = 2;
                ctx.beginPath();
                ctx.moveTo(0, 0);
                for (var j = 0; j < timeRows.length; j++) {
                    var cumSec = timeRows.item(j).cumSec;
                    var delta = cumSec - bestCumSec[j];
                    var x = xAxis[j];
                    var y = seconds2y(delta);
                    ctx.lineTo(x, y);
                }
                ctx.stroke();
            };
            osplits.webdb.db.readTransaction(function(tx) {
                tx.executeSql("SELECT runnerId, cumSec FROM time WHERE circuitId = ? AND toCtrl = 'A';",
                    [ circuitId ],
                    function(tx, result){
                        for (var i = 0; i < result.rows.length; i++) {
                            var t = result.rows.item(i);
                            totalTimes[t.runnerId] = t.cumSec;
                        }
                        tx.executeSql('SELECT min( t.legSec ) AS best, t.numInCircuit AS num FROM time t WHERE t.circuitId = ? GROUP BY t.numInCircuit ORDER BY t.numInCircuit;',
                                [ circuitId ],
                                function(tx, result) {
                                    var previous = 0;
                                    for (var i = 0; i < result.rows.length; i++) {
                                        var t = result.rows.item(i);
                                        bestTotal += t.best;
                                        bestCumSec.push(bestTotal);
                                    }
                                    var skipLabel = false;
                                    for (var i = 0; i < result.rows.length; i++) {
                                        var t = result.rows.item(i);
                                        var w = seconds2x(t.best);
                                        ctx.fillStyle = i % 2 ? '#F1F1F1' : '#E5E5E5';
                                        ctx.fillRect(previous, 0, w, osplits.graph.height);
                                        previous += w;
                                        
                                        // label
                                        var label = '' + t.num;
                                        ctx.font = '13pt';
                                        ctx.textAlign = 'right';
                                        ctx.fillStyle = '#0A0A0A';
                                        var metrics = ctx.measureText(label);
                                        var width = metrics.width;
                                        if (width > w && !skipLabel) {
                                            // skip this label...
                                            skipLabel = true;
                                        }
                                        else {
                                            skipLabel = false;
                                            ctx.fillText(label, previous, osplits.graph.height);
                                        }
                                        xAxis.push(previous);
                                    }
                            });
                        
                });
            });

            var buildRunnerCanvas = function(runnerId, callback) {
                osplits.webdb.db.readTransaction(function(tx) {
                    tx.executeSql('SELECT t.cumSec FROM time t WHERE t.circuitId = ? and t.runnerId = ? ORDER BY t.numInCircuit;', [ circuitId, runnerId ], function(tx, result) {
                        var c = document.createElement('canvas');
                        c.width = osplits.graph.width;
                        c.height = osplits.graph.height;
                        var ctx = c.getContext('2d');
                        plotRunner(runnerId, ctx, result.rows);
                        callback(c);
                    });
                });
            };

            return {
                rescaleAllPlots : function() {
                    var graphObj = this;
                    // Clear first
                    for (var rid in runnerPlots) {
                        if (runnerPlots.hasOwnProperty(rid)) {
                            var plot = runnerPlots[rid];
                            if (plot.shown) {
                                graphLayers.removeChild(plot.canvas);
                            }
                        }
                    }
                    runnerPlots = {};
                    // Reverse the runner to scale once and for all rather than for each selected runner
                    $(table).find('tbody.selected').reverse().each(function(index, elem) {
                        var runnerId = elem.dataset['runnerId'];
                        graphObj.showRunner(runnerId);
                    });
                },
                hideRunner: function(runnerId){
                    var plot = runnerPlots[runnerId];
                    if (plot && plot.shown) {
                        graphLayers.removeChild(plot.canvas);
                        plot.shown = false;
                        if (totalTimes[runnerId] === worstTotal) {
                            delete runnerPlots[runnerId];
                            // compute new worst and then clear and repaint
                            worstTotal = getWorst();
                            this.rescaleAllPlots();
                        }
                    } 
                },
                showRunner: function(runnerId){
                    var _showCanvas = function(canvas) {
                        runnerPlots[runnerId] = {canvas: canvas, shown:true, worst:worstTotal};
                        graphLayers.appendChild(canvas);
                    };
                    var totalTime = totalTimes[runnerId];
                    if (worstTotal < totalTime) {
                        // compute new worst and repaint
                        worstTotal = totalTime;
                        this.rescaleAllPlots();
                    }
                     else {
                        var plot = runnerPlots[runnerId];
                        if (!plot) {
                            buildRunnerCanvas(runnerId, _showCanvas);
                        }
                        else if (!plot.shown) {
                            _showCanvas(plot.canvas);
                        }
                    }
                },
                hide : function() {
                    table.parentElement.removeChild(graphLayers);
                },
                show : function() {
                    table.parentElement.appendChild(graphLayers);
                }
            };
        },
        toggleGraph: function(event) {
            var button = this;
            var table = $(button).parent().parent().find('table').get(0);
            var circuitId = parseInt(table.dataset.circuitId);
            var container = button.parentElement.parentElement;
            
            if (container.classList.toggle('graphMode')) {
                var graphObj = osplits.graph.circuits[circuitId];
                graphObj.show();
                button.innerText = chrome.i18n.getMessage('buttonShowTable');
                $(table).find('td').not('.last').hide();
                var totalElem = $(table).find('.total').filter(":visible").get(0);
                var graphLeft = totalElem.offsetLeft + totalElem.offsetWidth + 18; // +scrollbar
                $(container).find('.graph').css('left', (graphLeft + 20) + 'px');
                $(container).find('.scrollable').width(function(i, elem){
                    return graphLeft;
                });
            }
            else {
                $(table).find('td').show();
                button.innerText = chrome.i18n.getMessage('buttonShowGraph');
                osplits.graph.circuits[circuitId].hide();
            }
        }
    };

	window.osplits = osplits;
	chrome.runtime.onMessage.addListener(function(msg) {
		switch (msg.cmd) {
		case 'parse':
		    jQuery.fn.reverse = jQuery.fn.reverse || [].reverse;
			var found = osplits.parser.parseDocument();
			console.log("O'Splits: Parsing document found " + found + " circuits");
		    chrome.extension.sendMessage({cmd:'parseok', count:found });
			break;
        case 'readJson':
            jQuery.fn.reverse = jQuery.fn.reverse || [].reverse;
            var found = osplits.parser.storeJson(window.gecoOrienteeringResults);
            console.log("O'Splits: Read JSON & found " + found + " circuits");
            chrome.extension.sendMessage({cmd:'parseok', count:found });
            break;			
		case 'showtables':
			osplits.tables.toggleDisplay();
			break;
		}

	});
}