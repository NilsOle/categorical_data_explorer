/*console.log = function (message) {
    void(0);
};*/
String.prototype.replace_all = function(repl_var, repl_val) {
    var escapeRegExp = function(string) {
        return string.replace(/([.*+?^=!:${}()|\[\]\/\\])/g, "\\$1");
    };
    var replace_all = function(input_str, repl_var, repl_val) {
        return input_str.replace(new RegExp(escapeRegExp(repl_var), 'g'), repl_val);
    };
    var input_str = this;
    return replace_all(input_str, repl_var, repl_val);
};

Array.prototype.get_frequencies_arr = function() {
    var t = {};
    var a = this;
    _.chain(a)
        .groupBy(function(p) {
            return p;
        })
        .each(function(e, i) {
            t[i] = _.size(e);
        });
    return t;
};

if (!Array.prototype.filter) {
    Array.prototype.filter = function(fun /*, thisp*/ ) {
        var len = this.length >>> 0;
        if (typeof fun != "function")
            throw new TypeError();

        var res = [];
        var thisp = arguments[1];
        for (var i = 0; i < len; i++) {
            if (i in this) {
                var val = this[i]; // in case fun mutates this
                if (fun.call(thisp, val, i, this))
                    res.push(val);
            }
        }
        return res;
    };
}

Array.prototype.getIndexBy = function(name, value) {
    for (var i = 0; i < this.length; i++) {
        if (this[i][name] === value) {
            return i;
        }
    }
};

Array.prototype.sum_by_single_property = function(property) {
    return this.reduce(function(a, b) {
        return a + b[property];
    }, 0);
    // http://jsfiddle.net/h29wckn8/1/
    // http://stackoverflow.com/questions/5732043/javascript-reduce-on-array-of-objects
};

// or_condition constructor
var or_condition = function(condvar, values) {
    this.var = condvar;
    this.accepted_values = [];
    if (typeof values !== 'undefined') {
        this.accepted_values = _.uniq(values);
    }

    this.addNewValue = function(value) {
        this.accepted_values.push(value);
        this.accepted_values = _.uniq(this.accepted_values);
        return true;
    };

    this.removeValue = function(value) {
        this.accepted_values = _.without(this.accepted_values, value);

        return true;
    };

    this.getValues = function() {
        return this.accepted_values;
    };

    this.getVar = function() {
        return this.var;
    };

    this.isValue = function(value) {
        return (this.accepted_values.indexOf(value) !== -1);
    };

};

// subset constructor
var subset = function(name, id) {
    this.name = name;
    this.color = undefined;
    this.or_conditions = [];
    this.id = id;

    // to be called when user adds new condition value
    this.addNewOrValue = function(varname, value) {
        var check = this.getOrConditionByVarname(varname);
        if (check !== false) {
            check.addNewValue(value);
        } else {
            this.createNewOrCondition(varname, [value]);
        }
        return true;
    };

    // to be called when user unclicks condition value
    this.removeOrValue = function(varname, value) {
        var check = this.getOrConditionByVarname(varname);
        if (check === false) {
            return false;
        }
        check.removeValue(value);
        if (check.accepted_values.length === 0) {
            this.or_conditions = _.without(this.or_conditions, _.findWhere(this.or_conditions, {
                'var': varname
            }));
        }
        return true;
    };

    this.checkExistenceOfValueInOrConditionByValue = function(varname, value) {
        var check_var_existence = this.getOrConditionByVarname(varname);
        if (check_var_existence === false) {
            return false;
        }
        return check_var_existence.isValue(value);
    };

    this.getOrConditionByVarname = function(varname) {
        for (var i = 0; i < this.or_conditions.length; i++) {
            var cur_item = this.or_conditions[i];
            if (this.or_conditions[i].var === varname) {
                return cur_item;
            }
        }
        return false;
    };

    this.createNewOrCondition = function(varname, values) {
        this.or_conditions.push(new or_condition(varname, values));
    };

    this.setName = function(name) {
        this.name = name;
        return true;
    };

    this.setColor = function(colorcode) {
        this.color = colorcode;
        return true;
    };

    this.getConditionString = function() {
        var result_str = '';

        for (i = 0; i < this.or_conditions.length; i++) {
            var cur_condition = this.or_conditions[i];
            if (i > 0 && cur_condition.accepted_values.length > 0) {
                result_str += '\nAND ';
            }
            result_str += '( ';
            for (var j = 0; j < cur_condition.accepted_values.length; j++) {
                if (j > 0) {
                    result_str += ' OR';
                }
                result_str += ' ' + cur_condition.var+' == ' + cur_condition.accepted_values[j];
            }
            result_str += ' )';
        }
        if (result_str === '') {
            result_str = 'No conditions defined';
        }
        return result_str;
    };

};

var rendercount = 0;

(function($) {

    $.widget('qbnilsglueck.CatCluster', {

        options: {

            data_source: './dist/data/survey_data.csv',
            catvar_list: ['dispcode', 'v_1', 'v_2', 'v_3', 'v_4', 'v_6', 'v_7', 'v_18', 'v_200', 'v_204'], // List contains categorical var names
            sort_freq_by: 'value', // 'value' = sort by value asc, 'freq' = sort by freq desc
            var_labels: {
                'dispcode': 'Dispositionscode',
                'v_1': 'Sind Sie im Besitz eines gültigen Pkw-Führerscheins?',
                'v_2': 'Haben Sie ein eigenes Auto (Privat- oder Dienstwagen)?',
                'v_3': 'Könnten Sie ein Auto von Familienangehörigen, Freunden und/oder Bekannten gelegentlich nutzen?',
                'v_4': 'Steht Ihnen ein Fahrrad zur Verfügung?',
                'v_6': 'BahnCard',
                'v_7': 'Monatskarte, Jahreskarte oder Semesterticket des öffentlichen Personennahverkehrs (ÖPNV)',
                'v_18': 'Ein Auto ist für mich ein Symbol für Status und Prestige.',
                'v_200': 'Bitte geben Sie Ihr Geschlecht an.',
                'v_204': 'In welche der folgenden Kategorien fällt Ihr monatliches Netto-Einkommen (in Euro)?'

            },
            data_labels: {
                'dispcode': {
                    '21': 'Antwortet gerade',
                    '22': 'Unterbrochen',
                    '23': 'Wiederaufgenommen',
                    '31': 'Beendet',
                    '32': 'Beendet nach Unterbrechung',
                    '35': 'Abgewiesen bei Login (Quote geschlossen)',
                    '36': 'Abgewiesen (Quote geschlossen)',
                    '37': 'Ausgescreent',
                    '41': 'Quote geschlossen'
                },
                'v_1': {
                    '1': 'Ja',
                    '2': 'Nein',
                    '3': 'keine Angabe',
                    '-77': 'Fehlend',
                    '0': 'Nichts ausgewählt'
                },
                'v_2': {
                    '1': 'Ja',
                    '2': 'Nein',
                    '3': 'keine Angabe',
                    '-77': 'Fehlend',
                    '0': 'Nichts ausgewählt'
                },
                'v_3': {
                    '1': 'Ja',
                    '2': 'Nein',
                    '3': 'keine Angabe',
                    '-77': 'Fehlend',
                    '0': 'Nichts ausgewählt'
                },
                'v_4': {
                    '1': 'Ja',
                    '2': 'Nein',
                    '3': 'keine Angabe',
                    '-77': 'Fehlend',
                    '0': 'Nichts ausgewählt'
                },
                'v_6': {
                    '1': 'Ja',
                    '2': 'Nein',
                    '3': 'keine Angabe',
                    '-77': 'Fehlend',
                    '0': 'Nichts ausgewählt'
                },
                'v_7': {
                    '1': 'Ja',
                    '2': 'Nein',
                    '3': 'keine Angabe',
                    '-77': 'Fehlend',
                    '0': 'Nichts ausgewählt'
                },
                'v_18': {
                    '1': '5 (Stimme voll zu)',
                    '2': '4',
                    '3': '3 (teils, teils)',
                    '4': '2',
                    '5': '1 (stimme gar nicht zu)',
                    '6': 'Keine Angabe',
                    '-77': 'Fehlend',
                    '0': 'Nichts ausgewählt'
                },
                'v_200': {
                    '1': 'männlich',
                    '2': 'weiblich'
                },
                'v_204': {
                    '1': 'bis 499 Euro',
                    '2': '500 bis 999 Euro',
                    '3': '1.000 bis 1.499 Euro',
                    '4': '1.500 bis 1.999 Euro',
                    '5': '2.000 bis 2.499 Euro',
                    '6': '2.500 bis 2.999 Euro',
                    '7': '3.000 bis 3.499 Euro',
                    '8': '3.500 Euro und mehr',
                    '9': 'Keine Angabe'

                }
            },
            catvar_missing_value: '-77'

        },

        status: {
            last_selpoint: null, // OBJEKT-POINTER: Var mit zuletzt selektiertem HC-Point (könnte man auch über HC -> selectedPoints() regeln ....)
            last_selpoint_mode: false, // Status
            hc_obj_show: '#container', // pointer to DOM element on which HC is initialized
            hc_obj_select: '#selectcontainer',
            hot_obj: "#exampleGrid", // pointer to DOM element on which HOT is initialized
            subset_list_obj: '#subset_list',
            current_subset_edit_id: null,
            current_subset_edit_changemode: false, // speichert, ob das Plugin auf Änderungen der Edit-Formularinhalte reagieren soll
            current_active_section: undefined
        },

        varstack: {
            chart_show: undefined, // pointer to HC instance, i.e. highcharts() // globale Var mit HC Objekt
            chart_select: undefined,
            hot_instance: undefined, // pointer to HOT instance
            myData: undefined,
            hc_xvar_yelement_translator: {}, // HC: welchen data-indexwert der bubble series haben bestimmte ausprägungen einer bestimmten variable?
            hot_hc_translator: {},
            data_import: undefined,
            data_headers: undefined,
            data_columns: undefined,
            hc_x_axis_strings: [],
            max_length_values: undefined,
            missing_values: undefined, // sind missing values im datensatz zu finden?
            subset_id_counter: -1

        },

        _create: function() {
            var self = this,
                o = this.options,
                el = this.element;
            console.log('--- CatCluster: _create');
            $('#loader').modal('show');

            self._loadDataSource();


        },

        _HOT_getColumnDataByColumnName: function(columnName, dataset) {
            var self = this,
                o = this.options,
                el = this.element;
            console.log('--- CatCluster: _HOT_getColumnDataByColumnName');
            var result = [];
            for (var i = 0; i < dataset.length; i++) {
                result.push(dataset[i][columnName]);
            }
            return result;
        },

        _getValueLabelByVarAndValue: function(varname, value) {
            var self = this,
                o = this.options,
                el = this.element;
            console.log('--- CatCluster: _getValueLabelByVarAndValue');
            if (o.data_labels.hasOwnProperty(varname)) {
                if (o.data_labels[varname].hasOwnProperty(value)) {
                    return o.data_labels[varname][value];
                }
            }
            return '';
        },

        _sortObjByPropValueDesc: function(obj) {
            var self = this,
                o = this.options,
                el = this.element;
            console.log('--- CatCluster: _sortObjByPropValueDesc');
            // http://jsfiddle.net/uugLLvqc/2/
            var sortable = [];
            for (var v in obj) {
                sortable.push([v, obj[v]]);
            }
            sortable.sort(function(a, b) {
                return b[1] - a[1];
            });
            return sortable; // return an array like [["6", 9], ["-77", 6], ["5", 3]]
        },

        _sortObjByPropNameAsc: function(obj) {
            var self = this,
                o = this.options,
                el = this.element;
            console.log('--- CatCluster: _sortObjByPropNameAsc');
            // http://jsfiddle.net/uugLLvqc/2/
            var sortable = [];
            for (var v in obj) {
                sortable.push([v, obj[v]]);
            }
            sortable.sort(function(a, b) {
                return a[0] - b[0];
            });
            return sortable; // return an array like [["6", 9], ["-77", 6], ["5", 3]]
        },

        _shared_tooltip: function(hc_instance, point_ref) { //   x, y, affected_series_index) {
            var self = this,
                o = this.options,
                el = this.element;
            var x = point_ref.x;
            var y = point_ref.y;
            var affected_series_index = point_ref.series.index;
            var cur_catvar = point_ref['extra3'];
            var series = hc_instance.series;
            var s = cur_catvar + ': ' + o.var_labels[cur_catvar] + '<br/>'; //x + '|' + y;
            s += '<b>Option ' + point_ref['extra2'] + ': ' + self._getValueLabelByVarAndValue(cur_catvar, point_ref['extra2']) + '</b><br/>';

            $.each(series, function(key1, value1) {
                var data_el_x = value1.data.filter(function(el) {
                    return (el.x === x);
                });
                if (data_el_x.length === 0) {
                    return false;
                }
                var data_el_xy = data_el_x.filter(function(el) {
                    return (el.y === y);
                });
                var valfreq = (data_el_xy.length === 0) ? 0 : data_el_xy[0].z;
                var allfreq = 0;
                $.each(data_el_x, function(key2, value2) {
                    allfreq += value2.z;
                });

                if (key1 === affected_series_index) {
                    s += '<b>';
                }

                s += '<br/>' + value1.name + ': ' + valfreq + '/' + allfreq + ' (' + (valfreq / allfreq * 100).toFixed(2) + ' %)';

                if (key1 === affected_series_index) {
                    s += '</b>';
                }

            });

            return s;

        },

        _HOT_afterDeselect: function() {
            var self = this,
                o = this.options,
                el = this.element;
            console.log('afterDeselect fired!');
            if (self.status.last_selpoint_mode === false || self.status.last_selpoint['series'] === null) {
                return false;
            }
            console.log('HALT 001');
            console.log(self.status.last_selpoint);
            console.log(typeof self.status.last_selpoint);
            self.status.last_selpoint.select(false, false);
            console.log('HALT 002');
            self.varstack.chart_show.tooltip.hide();
            console.log('HALT 003');
            self.status.last_selpoint_mode = false;
            console.log('last_selpoint type is now:');
            console.log(self.status.last_selpoint);
            console.log(typeof self.status.last_selpoint);
            return true;
        },

        _start_hot: function() {
            var self = this,
                o = this.options,
                el = this.element;
            console.log('--- CatCluster: _start_hot');
            $('#loader div.modal-body').append($('<b></b>', {
                'html': 'Initializing Handsontable data grid ... <br>'
            }));

            console.log(self.status.hot_obj);
            console.log($(self.status.hot_obj));
            $(self.status.hot_obj).handsontable({
                data: self.varstack.myData,
                startRows: 5,
                height: 200,
                startCols: 5,
                minSpareCols: 0,
                //always keep at least 1 spare row at the right
                minSpareRows: 0,
                //always keep at least 1 spare row at the bottom,
                rowHeaders: true,
                contextMenu: false,
                colHeaders: self.varstack.data_headers,
                columns: self.varstack.data_columns,
                beforeRender: function(is_forced) {
                    console.log(rendercount + 'rendering about to take place, is_forced:');

                    console.log(is_forced);
                    var currentdate = new Date();
                    console.log('--- CatCluster: _rendering_finished ' + currentdate.getDate() + "/" +
                        (currentdate.getMonth() + 1) + "/" +
                        currentdate.getFullYear() + " @ " +
                        currentdate.getHours() + ":" +
                        currentdate.getMinutes() + ":" +
                        currentdate.getSeconds() + ":" +
                        currentdate.getMilliseconds());
                },
                afterRender: function(is_forced) {

                    console.log(rendercount + 'rendering took place, is_forced:');

                    console.log(is_forced);
                    var currentdate = new Date();
                    console.log('--- CatCluster: _rendering_finished ' + currentdate.getDate() + "/" +
                        (currentdate.getMonth() + 1) + "/" +
                        currentdate.getFullYear() + " @ " +
                        currentdate.getHours() + ":" +
                        currentdate.getMinutes() + ":" +
                        currentdate.getSeconds() + ":" +
                        currentdate.getMilliseconds());
                    rendercount++;
                },
                afterInit: function() {
                    self.varstack.hot_instance = $(self.status.hot_obj).data('handsontable');
                },
                afterDeselect: function() {
                    if (self.status.current_active_section === 'single') {
                        self._trigger('0016', null, {
                            'just': 'a value'
                        });
                    } else {
                        self._trigger('0015', null, {
                            'just': 'a value'
                        });
                    }

                    return true;

                },

                afterSelectionEndByProp: function(r1, p1, r2, p2) {
                    var ref_obj = {
                        'r1': r1,
                        'p1': p1,
                        'r2': r2,
                        'p2': p2
                    };
                    if (self.status.current_active_section === 'sample' || self.status.current_active_section === 'subset') {
                        self._trigger('0004', null, ref_obj);
                    }
                    if (self.status.current_active_section === 'single') {
                        self._trigger('0008', null, ref_obj);
                    }
                    return true;
                },

                afterChange: function(changes, source) {
                    // hat sich die sample-zuordnung von mindestens einem element geändert? Dann Alarm schlagen, weil HOT neu geladen werden muss
                    console.log('afterChange fired!');
                    console.log(changes);
                    if (changes === null) {
                        console.log('changes is null');
                        return false;
                    }
                    for (var i = 0; i < changes.length; i++) {
                        if (changes[i][1] === 'include in sample') {
                            console.log('HOT says the sample selection changed!');
                            self._updateCurrentSampleNumbers();
                            if (self.status.current_active_section === 'sample') {
                                self._trigger('0005', null, {
                                    'just': 'a value'
                                });
                            }
                            if (self.status.current_active_section === 'subset') {
                                self._trigger('0006', null, {
                                    'just': 'a value'
                                });
                            }
                            if (self.status.current_active_section === 'single') {
                                self._trigger('0007', null, {
                                    'just': 'a value'
                                });
                            }
                            break;
                        }
                    }

                }




            });
            console.log('heyho!');


            // self.varstack.hot_instance = $(self.varstack.hot_obj).handsontable();

            self._generate_hc_vars();


        },

        // Neue Datenreihe für HC generieren
        // TODO: callback für event bzw. ganzes objekt zum mergen ergänzen?? so könnte man auch eine subset-id oder cluster-id anhängen siehe notizen
        _generateNewHCSeriesData: function(dataset, name, type, id, additional_properties_obj) {
            var self = this,
                o = this.options,
                el = this.element;
            console.log('--- CatCluster: _generateNewHCSeriesData');
            var ranked_values = []; // contains the freq values
            var output_data = [];
            for (var i = 0; i < o.catvar_list.length; i++) {
                var cur_catvar = o.catvar_list[i];
                var all_values = self._HOT_getColumnDataByColumnName(cur_catvar, dataset);
                var freq_all_values = all_values.get_frequencies_arr();
                var cur_ranked_values = self._sortObjByPropValueDesc(freq_all_values);
                for (var j = 0; j < cur_ranked_values.length; j++) {
                    var cur_value = cur_ranked_values[j];
                    var cur_y_pos = self.varstack.hot_hc_translator[cur_catvar][cur_value[0]];
                    var cur_obj = {
                        x: i, // num: Pos. x
                        y: cur_y_pos, // num: Pos. y
                        z: cur_value[1], // freq
                        extra0: cur_value[0] + ": " + self._getValueLabelByVarAndValue(cur_catvar, cur_value[0]),
                        extra1_viewtype: name,
                        extra2: cur_value[0], // neu hinzugekommen
                        extra3: cur_catvar,
                        extra4_type: type,
                        extra5_id: id
                    };

                    if (typeof additional_properties_obj !== 'undefined') {
                        for (var attrname in additional_properties_obj) {
                            cur_obj[attrname] = additional_properties_obj[attrname];
                        }
                    }


                    output_data.push(cur_obj);
                }
            }
            return output_data;
        },

        // Nachdem HOT geladen wurde, werden nun die HC-Vars festgelegt (bleiben IMMER gültig)
        _generate_hc_vars: function() {
            var self = this,
                o = this.options,
                el = this.element;
            console.log('--- CatCluster: _generate_hc_vars');
            $('#loader div.modal-body').append($('<b></b>', {
                'html': 'Preparing Highcharts chart options ... <br>'
            }));
            self.varstack.max_length_values = 0;
            self.varstack.missing_values = false;
            var ranked_values = []; // contains the freq values
            for (var i = 0; i < o.catvar_list.length; i++) {
                var cur_catvar = o.catvar_list[i];
                var all_values = self._HOT_getColumnDataByColumnName(cur_catvar, self.varstack.myData);
                var unique_cur_catvar = _.uniq(all_values);
                var nr_unique_values = unique_cur_catvar.length;
                var freq_all_values = all_values.get_frequencies_arr();
                var value = (o.sort_freq_by === 'freq') ? self._sortObjByPropValueDesc(freq_all_values) : self._sortObjByPropNameAsc(freq_all_values);
                ranked_values.push(value);

                if (nr_unique_values > self.varstack.max_length_values) {
                    self.varstack.max_length_values = nr_unique_values;
                }
            }
            console.log('max_length_values - wie viele unterschiedliche werte gibt es maximal?');
            console.log(self.varstack.max_length_values);
            console.log('kommen missing values vor?');
            console.log(self.varstack.missing_values);


            for (i = 0; i < o.catvar_list.length; i++) {
                var cur_catvar = o.catvar_list[i];
                var cur_ranked_values = ranked_values[i];
                for (var j = 0; j < cur_ranked_values.length; j++) {
                    var cur_value = cur_ranked_values[j];
                    var cur_y_pos = (self.varstack.missing_values === true) ? self.varstack.max_length_values - 2 - j : self.varstack.max_length_values - 1 - j;

                    console.log('cur_value 0:');
                    console.log(cur_value[0]);
                    console.log(typeof cur_value[0]);
                    console.log(parseInt(o.catvar_missing_value));

                    if (!self.varstack.hot_hc_translator.hasOwnProperty(cur_catvar)) {
                        self.varstack.hot_hc_translator[cur_catvar] = {};
                    }
                    self.varstack.hot_hc_translator[cur_catvar][cur_value[0]] = cur_y_pos;
                }
            }

            // danach die y-Koordinaten festlegen; auch die Werte in self.varstack.hc_xvar_yelement_translator und self.varstack.hot_hc_translator schreiben

            for (i = 0; i < o.catvar_list.length; i++) {
                cur_catvar = o.catvar_list[i];
                var cur_catvar_axis_string = cur_catvar;
                if (o.var_labels.hasOwnProperty(cur_catvar)) {
                    cur_catvar_axis_string = cur_catvar_axis_string + ': ' + o.var_labels[cur_catvar];
                }
                self.varstack.hc_x_axis_strings.push(cur_catvar_axis_string);
            }

            $('#loader div.modal-body').append($('<b></b>', {
                'html': 'Starting Highcharts instances ... <br>'
            }));

            // Starten einer HC-Instanz auf das jQuery-Element mit dem Selektor hc_obj_show; Speichern des Instanz-Pointers nach dem Laden in varstack.chart_show
            self._start_hc(self.status.hc_obj_show, 'chart_show', function() {
                // self._addSeriesToHC ( self.varstack.chart_show , 'TEST', self._generateNewHCSeriesData ( self.varstack.myData , 'TEST', 'sample', '0' ), 'sample', '0' ) ;
            });

            // Starten einer HC-Instanz auf das jQuery-Element mit dem Selektor hc_obj_select; Speichern des Instanz-Pointers nach dem Laden in varstack.chart_select
            self._start_hc(self.status.hc_obj_select, 'chart_select', function() {

            });

            $('#loader div.modal-body').append($('<b></b>', {
                'html': 'Loading functionality ... <br>'
            }));

            self._loadFunctionality();

            $('#loader div.modal-body').append($('<b></b>', {
                'html': 'Done! <br>'
            }));
            $('#loader').modal('hide');
            $('#mainnav a#sample_li').trigger("click");

        },

        _array_to_html_renderer: function(instance, td, row, col, prop, value, cellProperties) {
            // good examples on: https://handsontable.com/demo/renderers_html.html
            // td is a special object

            if (Object.prototype.toString.call(value) === '[object Array]') {
                td.innerHTML = 'list: [' + value.join(',') + ']';
                // todo ergänzen: htnl mit link auf jeweiliges subset-/cluster-highlighting (vorher value-array nach subset_id sortieren)
            }
            return td;
        },

        _loadDataSource: function() {
            var self = this,
                o = this.options,
                el = this.element;
            console.log('--- CatCluster: _loadDataSource');
            $('#loader div.modal-body').append($('<b></b>', {
                'html': 'Fetching CSV data source ... <br>'
            }));


            $.get(o.data_source, function(data) {

                var csvJSON = function(csv) {

                    // make sure win breaks are stripped
                    var lines = csv.replace_all("\r", "").split("\n");

                    var result = [];

                    self.varstack.data_headers = ['include in sample', 'part of subsets', 'part of clusters'].concat(lines[0].substring(1, lines[0].length - 1).split("\";\""));

                    for (var i = 1; i < lines.length; i++) {

                        var obj = {};
                        var currentline = lines[i].substring(1, lines[i].length - 1).split("\";\"");

                        obj['include in sample'] = true;
                        obj['part of subsets'] = [];
                        obj['part of clusters'] = [];

                        for (var j = 3; j < self.varstack.data_headers.length; j++) {
                            obj[self.varstack.data_headers[j]] = currentline[j - 3];
                        }

                        result.push(obj);
                    }

                    self.varstack.data_columns = [{
                            data: "include in sample",
                            type: "checkbox"
                        },
                        {
                            data: "part of subsets",
                            type: "text",
                            renderer: self._array_to_html_renderer
                        },
                        {
                            data: "part of clusters",
                            type: "text",
                            renderer: self._array_to_html_renderer
                        }
                    ];

                    for (var z = 3; z < self.varstack.data_headers.length; z++) {
                        self.varstack.data_columns[z] = {
                            data: self.varstack.data_headers[z]
                        }
                    }

                    return result;
                };
                console.log('load was performed!');
                self.varstack.data_import = csvJSON(data);
                self.varstack.myData = self.varstack.data_import;
                self._start_hot();

            });
        },

        _addSeriesToHC: function(hc_instance, name, hc_data, type, id, additional_properties_obj) {
            var series_obj = {
                name: name,
                id: 'series-' + type + '-' + id,
                data: hc_data,
                type: 'bubble',
                dataLabels: {
                    enabled: true
                },
                extra_type: type,
                extra_id: id
            };
            if (typeof additional_properties_obj !== 'undefined') {
                for (var attrname in additional_properties_obj) {
                    series_obj[attrname] = additional_properties_obj[attrname];
                }
            }

            hc_instance.addSeries(series_obj);
            return true;
        },

        // series can be array (removes all series whoose names are specified), or null (removes all series)
        _removeSeriesFromChart: function(hc_instance, series_arr) {
            if (series_arr === null) {
                while (hc_instance.series.length > 0) {
                    hc_instance.series[0].remove(true);
                }
            } else {
                for (var i = 0; i < series_arr.length; i++) {
                    var cur_series_id = series_arr[i].id;
                    series_arr[i].remove(true);
                }
            }
            return true;
        },

        _start_hc: function(obj_selector, instance_pointer_name, callback_fct) {
            var self = this,
                o = this.options,
                el = this.element;
            console.log('--- CatCluster: _start_hc');

            var tmp_categories_strings = [];
            for (var i = 0; i < self.varstack.max_length_values; i++) {
                tmp_categories_strings.push('y' + i);
            }

            var chart_width = o.catvar_list.length * 180;

            $(obj_selector).css('width', chart_width + 'px');

            $(obj_selector).highcharts({

                chart: {

                    // width 100%:,
                    wdith: chart_width,
                    height: self.varstack.max_length_values * 80,
                    backgroundColor: '#FFFFFF', // '#333333',
                    zoomType: 'xy',
                    events: {
                        load: function() {
                            console.log('Loaded HC!!');
                            self.varstack[instance_pointer_name] = $(obj_selector).highcharts();

                            callback_fct();

                        }
                    }

                },


                tooltip: {
                    useHTML: true,
                    formatter: function() {
                        console.log('das objekt:');
                        console.log(this);
                        var ref_obj;

                        if (!this.hasOwnProperty('point')) {
                            ref_obj = this.points[0].point;
                        } else {
                            ref_obj = this.point;
                        }
                        return self._shared_tooltip(self.varstack[instance_pointer_name], ref_obj);
                    },
                    shared: true
                },

                title: {
                    text: ''
                },
                subTitle: {
                    text: ''
                },


                legend: {
                    enabled: false
                },

                xAxis: {
                    categories: self.varstack.hc_x_axis_strings,
                    alternateGridColor: 'gray',
                    min: 0,
                    max: self.varstack.hc_x_axis_strings.length - 1,
                    opposite: true,
                    labels: {
                        y: -50,
                        formatter: function() {
                            var text_display = (this.value.length > 40) ? this.value.substr(0, 40) + '...' : this.value;
                            //return '<a href="#" data-type="xlabel" style="color:#000000;" data-varname="' + this.value.substr(0, this.value.indexOf(':')) + '">' + text_display + '</a>';

                            return text_display;


                        },
                        useHTML: false // should be true in future
                    }
                },

                yAxis: {

                    labels: {
                        enabled: false
                    },
                    categories: tmp_categories_strings,
                    min: 0,
                    max: self.varstack.max_length_values - 1
                },

                series: []
            });

        },

        _getSubsetObjectById: function(id) {
            var self = this,
                o = this.options,
                el = this.element;
            var $get_it = $(self.status.subset_list_obj).find('li[id="subset_id' + id + '"]').first();
            if ($get_it.length === 0) {

                return false;
            }
            return $get_it.data();
        },


        // Loads the edit section, cleans it up first
        _edit_subset: function(subset_id) {
            var self = this,
                o = this.options,
                el = this.element;
            console.log('--- CatCluster: _edit_subset with id: ' + subset_id);

            console.log(self.varstack.chart_select);


            self._removeSeriesFromChart(self.varstack.chart_select, null);


            var cur_sample_condition = new or_condition('include in sample', [true]);

            var cur_sample_data = self._filterDataByBunchOfORconditions([cur_sample_condition]);

            if (cur_sample_data.length === 0) {
                //alert('Error: No elements in current sample. Abort.');
                return false;
            }

            var cur_subset_obj = self._getSubsetObjectById(subset_id);
            if (cur_subset_obj === false) {
                //alert('Error: No subset with id ' + subset_id + ' found. Abort.');
                return false;
            }

            self.status.current_subset_edit_id = subset_id;
            self.status.current_subset_edit_changemode = false;

            var subset_color = cur_subset_obj['color'];
            if (typeof subset_color !== 'undefined') { // color is already set
                $("#color_input").val(subset_color);
                $('#color_input').colpickSetColor(subset_color);
            } else { // no color set yet
                $("#color_input").val('');
            }


            var subset_name = cur_subset_obj['name'];
            $("#input_subset_name").val(subset_name);


            self.status.current_subset_edit_changemode = true;

            var hc_select_data = self._generateNewHCSeriesData(cur_sample_data, 'Current sample distribution', 'sample', '0');

            var hc_series_obj = {

                allowPointSelect: true,
                marker: {
                    states: {
                        selected: {
                            fillColor: 'red'
                        }
                    }
                },
                'color': subset_color,
                point: {
                    events: {
                        click: function(event) {
                            event.preventDefault(); // this prevents the default point selection
                            console.log('click on point!');
                            var cur_var = this['extra3'];
                            var cur_value = this['extra2'];
                            console.log('Wert "' + cur_value + '" von Variable "' + cur_var + '" ist betroffen');
                            var is_in_condition = cur_subset_obj.checkExistenceOfValueInOrConditionByValue(cur_var, cur_value);
                            console.log('Ist dieser Wert in einer Condition? ' + is_in_condition);
                            if (is_in_condition === true) {
                                cur_subset_obj.removeOrValue(cur_var, cur_value);
                            } else {
                                cur_subset_obj.addNewOrValue(cur_var, cur_value);
                            }
                            console.log(self.varstack.chart_select.series[0].data[0]);
                            self._loadSubsetConditionalDataIntoEditSection(cur_subset_obj);
                        }
                    }
                }
            };

            if (typeof subset_color !== 'undefined') {
                hc_series_obj['color'] = subset_color;
            }


            self._addSeriesToHC(self.varstack.chart_select, 'Current sample distribution', hc_select_data, 'sample', '0', hc_series_obj);
            self._loadSubsetConditionalDataIntoEditSection(cur_subset_obj);

        },

        _loadSubsetConditionalDataIntoEditSection: function(cur_subset_obj) {
            var self = this,
                o = this.options,
                el = this.element;
            self._highlightSeriesBubblesByOrConditionSet(self.varstack.chart_select.series[0].data, cur_subset_obj['or_conditions']);
            $('span#tmpl_current_subset_conditionstring').text(cur_subset_obj.getConditionString());
            console.log('or_conditions of current subset:');
            console.log(cur_subset_obj['or_conditions']);
            $('span#tmpl_current_subset_numbers').text(self._updateDomElementWithTemplateContent('currently {{OVERALL}} respondents in subset ({{INSAMPLE}} in current sample)', {
                'OVERALL': self._filterDataByBunchOfORconditions(cur_subset_obj['or_conditions']).length,
                'INSAMPLE': self._filterDataByBunchOfORconditions(cur_subset_obj['or_conditions'].concat(new or_condition('include in sample', [true]))).length
            }));
        },

        _handle_sample_change: function() {

        },

        _update_subset_list_entry: function(subset_id) {
            var self = this,
                o = this.options,
                el = this.element;
            var $cur_subset = $('li#subset_id' + subset_id);
            if ($cur_subset.length === 0) {
                return false;
            }
            $cur_subset.find('div span.big').text($cur_subset.data()['name']);
            $cur_subset.css('background-color', $cur_subset.data()['color']);

            var subset_data_all = self._filterDataBySubsetID({
                'id': subset_id
            });
            var subset_data_insample = self._filterDataByBunchOfORconditions(
                [new or_condition('include in sample', [true])], subset_data_all
            );
            $cur_subset.find('div span[data-content="numbers"]').text(self._updateDomElementWithTemplateContent('{{INSAMPLE}} in sample, {{OVERALL}} total', {
                'OVERALL': subset_data_all.length,
                'INSAMPLE': subset_data_insample.length
            }));
            return true;
        },


        _update_hc_subset_series: function(subset_id) {
            var self = this,
                o = this.options,
                el = this.element;
            console.log('--- CatCluster: _update_hc_subset_series with subset_id: ' + subset_id);
            // get the elements of or_conditions+samplecondition
            var $cur_subset = $('li#subset_id' + subset_id);
            if ($cur_subset.length === 0) {
                return false;
            }
            var cur_subset_data_obj = $cur_subset.data();
            var or_conditions = cur_subset_data_obj['or_conditions'];
            var name = cur_subset_data_obj['name'];
            var color = cur_subset_data_obj['color'];
            console.log(or_conditions.concat(new or_condition('include in sample', [true])));
            var subset_data = self._filterDataByBunchOfORconditions(
                or_conditions.concat(new or_condition('include in sample', [true]))
            );
            console.log(subset_data);
            var hc_data_set = self._generateNewHCSeriesData(subset_data, name, 'subset', subset_id);
            var check_series_existence = self.varstack.chart_show.get('series-subset-' + subset_id); // returns null if nothing found: http://jsfiddle.net/avdfp7ou/
            self._update_hc_series(check_series_existence, hc_data_set, {
                'name': name,
                'color': color
            });
            return true;
        },

        _update_data_subset_elements: function(subset_id) {
            var self = this,
                o = this.options,
                el = this.element;
            var $cur_subset = $('li#subset_id' + subset_id);
            if ($cur_subset.length === 0) {
                return false;
            }
            var cur_subset_data_obj = $cur_subset.data();
            var or_conditions = cur_subset_data_obj['or_conditions'];
            var subset_data = self._filterDataByBunchOfORconditions(
                or_conditions
            );
            _.each(subset_data, function(element, index, list) {
                self.varstack.myData[self.varstack.myData.getIndexBy('lfdn', element['lfdn'])]['part of subsets'] = _(element['part of subsets'].concat(subset_id)).uniq();

            });
            console.log('1 varstack HOT instance object: ');
            console.log(self.varstack.hot_instance);
            self.varstack.hot_instance.render();
            return true;
        },

        _remove_subset_from_data: function(subset_id) {
            var self = this,
                o = this.options,
                el = this.element;
            var subset_data = self._filterDataBySubsetID({
                'id': subset_id
            });
            _.each(subset_data, function(element, index, list) {
                self.varstack.myData[self.varstack.myData.getIndexBy('lfdn', element['lfdn'])]['part of subsets'] = _(element['part of subsets']).without(subset_id);

            });
            console.log('2 varstack HOT instance object: ');
            console.log(self.varstack.hot_instance);
            self.varstack.hot_instance.render();
            return true;
        },

        _toggle_subset_visibility_button_status: function(subset_id, mode) {
            var self = this,
                o = this.options,
                el = this.element;
            console.log('visibility toogle: callback fired! mode: ' + mode);
            var $cur_subset_button_visibility = $(self.status.subset_list_obj).find('li[id="subset_id' + subset_id + '"]').first().find('button[data-type="btn_togglevisibilty_subset"]');
            if ($cur_subset_button_visibility.length === 0) {
                return false;
            }
            $cur_subset_button_visibility.attr('data-status', mode);
            var mode_icon = (mode === 'show') ? '&#xe0c6;' : '&#xe0c7;';
            $cur_subset_button_visibility.empty().html('<span class="fs1" aria-hidden="true" data-icon="' + mode_icon + '"></span>');
            return true;
        },

        _toggle_sample_visibility_button_status: function(sample_id, mode) {
            var self = this,
                o = this.options,
                el = this.element;
            console.log('sample visibility toogle: callback fired! mode: ' + mode);
            var $cur_subset_button_visibility = $(self.status.subset_list_obj).find('li[id="sample_id' + sample_id + '"]').first().find('button[data-type="btn_togglevisibilty_sample"]');
            if ($cur_subset_button_visibility.length === 0) {
                return false;
            }
            $cur_subset_button_visibility.attr('data-status', mode);
            var mode_icon = (mode === 'show') ? '&#xe0c6;' : '&#xe0c7;';
            $cur_subset_button_visibility.empty().html('<span class="fs1" aria-hidden="true" data-icon="' + mode_icon + '"></span>');
            return true;
        },

        _toggle_single_visibility_button_status: function(single_id, mode) {
            var self = this,
                o = this.options,
                el = this.element;
            console.log('single visibility toogle: callback fired! mode: ' + mode);
            var $cur_subset_button_visibility = $(self.status.subset_list_obj).find('li[id="single_id' + single_id + '"]').first().find('button[data-type="btn_togglevisibilty_single"]');
            if ($cur_subset_button_visibility.length === 0) {
                return false;
            }
            $cur_subset_button_visibility.attr('data-status', mode);
            var mode_icon = (mode === 'show') ? '&#xe0c6;' : '&#xe0c7;';
            $cur_subset_button_visibility.empty().html('<span class="fs1" aria-hidden="true" data-icon="' + mode_icon + '"></span>');
            return true;
        },

        _update_hc_sample_series: function() {
            var self = this,
                o = this.options,
                el = this.element;
            // get the elements of samplecondition
            // if zero elements: remove series, return false
            // generate a hc_dataset
            // initiate _update_hc_series
            var cur_sample_condition = new or_condition('include in sample', [true]);
            var cur_sample_data = self._filterDataByBunchOfORconditions([cur_sample_condition]);
            var hc_data_set = self._generateNewHCSeriesData(cur_sample_data, 'Sample distribution', 'sample', '0');
            var check_series_existence = self.varstack.chart_show.get('series-sample-0'); // returns null if nothing found: http://jsfiddle.net/avdfp7ou/
            self._update_hc_series(check_series_existence, hc_data_set);
        },

        _update_hc_series: function(hc_series_pointer, hc_dataset, additional_properties_obj /* eg {name, color, zindex}*/ ) {
            var self = this,
                o = this.options,
                el = this.element;
            var chart_pointer = self.varstack.chart_show;
            var series_obj = {
                'data': hc_dataset
            };
            if (typeof additional_properties_obj !== 'undefined') {
                for (var attrname in additional_properties_obj) {
                    series_obj[attrname] = additional_properties_obj[attrname];
                }
            }
            hc_series_pointer.update(series_obj, false);
            chart_pointer.redraw();
            return true;
        },

        _subset_to_front: function(subset_id) {
            var self = this,
                o = this.options,
                el = this.element;
            self.varstack.chart_show.get('series-subset-' + subset_id).group.toFront();
            return true;
        },

        _sample_to_front: function() {
            var self = this,
                o = this.options,
                el = this.element;
            var getit = self.varstack.chart_show.get('series-sample-0');
            if (getit === null) {
                return false;
            }
            getit.group.toFront();
            return true;
        },

        _single_to_front: function() {
            var self = this,
                o = this.options,
                el = this.element;
            var getit = self.varstack.chart_show.get('series-single-0');
            if (getit === null) {
                return false;
            }
            getit.group.toFront();
            return true;
        },

        _getAllSeriesColor: function() {
            var self = this,
                o = this.options,
                el = this.element;
            var all_colors = [];
            _(self.varstack.chart_show.series).each(function(value) {
                all_colors.push(value.color);
            });
            return all_colors;
        },

        _create_subset: function(trigger_0014) {
            var self = this,
                o = this.options,
                el = this.element;
            console.log('--- CatCluster: _create_subset');
            self.varstack.subset_id_counter++;
            var color = null;
            var arr_all_used_colors = self._getAllSeriesColor();
            var standard_colors = $(self.status.hc_obj_show).highcharts().options.colors; // http://api.highcharts.com/highcharts#colors

            var continue_each = true;
            _(standard_colors).each(function(value) {
                if (continue_each === true) {
                    if (arr_all_used_colors.indexOf(value) === -1) {
                        continue_each = false;
                        color = value;
                    }
                }

            });

            console.log('COLOR!');
            console.log(color);

            if (color === null) {
                color = standard_colors[1];
            }


            $(self.status.subset_list_obj).append(
                $('<li></li>', {
                    'id': 'subset_id' + self.varstack.subset_id_counter,
                    'class': 'bg-distribution-box',
                    'data': new subset('Subset ' + (self.varstack.subset_id_counter + 1), self.varstack.subset_id_counter),
                    'css': {
                        'background-color': color,
                        'height': '80px'
                    }
                })
                .append(
                    $('<div></div>', {
                        'class': 'details'
                    })
                    .append($('<span></span>', {
                        'class': 'big',
                        'text': 'Subset ID ' + self.varstack.subset_id_counter
                    }))
                    .append($('<span></span>', {
                        'text': '',
                        'class': 'small',
                        'data-content': 'numbers'
                    }))
                    .append($('<button></button>', {
                        'text': 'Edit subset',
                        'data-type': 'btn_edit_subset',
                        'class': 'btn btn-default btn-xs',
                        'html': '<span class="fs1" aria-hidden="true" data-icon="&#xe005;"></span>'
                        /*'data-toggle': 'modal',
                         'data-target': '#div_edit_section'*/
                    }))
                    .append($('<button></button>', {
                        'text': 'Delete subset',
                        'data-type': 'btn_delete_subset',
                        'class': 'btn btn-default btn-xs',
                        'html': '<span class="fs1" aria-hidden="true" data-icon="&#xe0a7;"></span>'
                    }))
                    .append($('<button></button>', {
                        'text': 'toggle visibility',
                        'data-type': 'btn_togglevisibilty_subset',
                        'data-status': 'show',
                        'class': 'btn btn-default btn-xs',
                        'html': '<span class="fs1" aria-hidden="true" data-icon="&#xe0c6;"></span>'
                    }))
                    .append($('<button></button>', {
                        'text': 'to front',
                        'data-type': 'btn_tofront_subset',
                        'class': 'btn btn-default btn-xs',
                        'html': '<span class="fs1" aria-hidden="true" data-icon="&#xe120;"></span>'
                    }))
                )
            );


            var cur_subset_obj = self._getSubsetObjectById(self.varstack.subset_id_counter);

            cur_subset_obj.setColor(color);

            self._addSeriesToHC(self.varstack.chart_show, cur_subset_obj['name'], [], 'subset', cur_subset_obj['id'], {
                'events': {
                    'show': function() {
                        self._toggle_subset_visibility_button_status(cur_subset_obj['id'], 'show');
                    },
                    'hide': function() {
                        self._toggle_subset_visibility_button_status(cur_subset_obj['id'], 'hide');
                    }
                },
                dataLabels: {
                    enabled: false
                },
                'color': cur_subset_obj['color']
            });

            self._loadFunctionality('edit_buttons');

            if (typeof trigger_0014 !== 'undefined') {
                $('li#subset_id' + self.varstack.subset_id_counter + ' button[data-type="btn_edit_subset"]').trigger("click");
            }

        },

        _findEventTarget: function($jquery_obj_event_target, selector) {

            if ($jquery_obj_event_target[0].localName === selector) {
                return $jquery_obj_event_target;
            }

            return $jquery_obj_event_target.parents(selector).first();

        },

        _loadFunctionality: function(restrictions) {
            var self = this,
                o = this.options,
                el = this.element;
            var continue_state = true;
            if (restrictions === 'edit_buttons') {
                continue_state = false;
                $('[data-type="btn_edit_subset"]').off('click').on('click', function(event) {
                    self._trigger('0014', event, {
                        'just': 'a value'
                    });
                    return true;
                });

                $('[data-type="btn_delete_subset"]').off('click').on('click', function(event) {
                    self._trigger('0011', event, {
                        'just': 'a value'
                    });
                    return true;
                });

                $('[data-type="btn_togglevisibilty_subset"]').off('click').on('click', function(event) {
                    var action = (self._findEventTarget(self._findEventTarget($(event.target), 'button'), 'button').attr('data-status') === 'show') ? 'hide' : 'show';
                    self._trigger('0012', event, {
                        'action': action
                    });
                    return true;
                });


                $('[data-type="btn_tofront_subset"]').off('click').on('click', function(event) {
                    self._trigger('0017', event, {
                        'just': 'a value'
                    });
                    return true;
                });


            }

            if (restrictions === 'sample_buttons') {
                continue_state = false;
                $('[data-type="btn_togglevisibilty_sample"]').off('click').on('click', function(event) {
                    var action = (self._findEventTarget($(event.target), 'button').attr('data-status') === 'show') ? 'hide' : 'show';
                    self._trigger('0022', event, {
                        'action': action
                    });
                    return true;
                });
                $('[data-type="btn_tofront_sample"]').off('click').on('click', function(event) {
                    self._trigger('0024', event, {
                        'just': 'a value'
                    });
                    return true;
                });
            }

            if (restrictions === 'single_buttons') {
                continue_state = false;
                $('[data-type="btn_togglevisibilty_single"]').off('click').on('click', function(event) {
                    var action = (self._findEventTarget($(event.target), 'button').attr('data-status') === 'show') ? 'hide' : 'show';
                    self._trigger('0023', event, {
                        'action': action
                    });
                    return true;
                });


                $('[data-type="btn_tofront_single"]').off('click').on('click', function(event) {
                    self._trigger('0025', event, {
                        'just': 'a value'
                    });
                    return true;
                });
            }

            if (restrictions === 'show_chart_xlabels') {
                continue_state = false;
                $(self.status.hc_obj_show).find('a[data-type="xlabel"]').on('click', function(event) {
                    event.preventDefault();
                    self._trigger('0021', event, {
                        'just': 'a value'
                    });
                    return true;
                });
            }

            if (continue_state === true) {

                $('#mainnav a#sample_li').on('click', function(event) {
                    $('div#mainnav ul li.active').removeAttr('class');
                    $('span.current-arrow').remove();
                    $(this).attr('class', 'active').prepend($('<span></span>', {
                        'class': 'current-arrow',
                        'html': '&nbsp;'
                    }));


                    self._trigger('0000', event, {
                        'just': 'a value'
                    });
                    return true;
                });

                $('#mainnav a#subsets_li').on('click', function(event) {
                    $('div#mainnav ul li.active').removeAttr('class');
                    $('span.current-arrow').remove();
                    $(this).attr('class', 'active').prepend($('<span></span>', {
                        'class': 'current-arrow',
                        'html': '&nbsp;'
                    }));
                    self._trigger('0001', event, {
                        'just': 'a value'
                    });
                    return true;
                });

                $('#mainnav a#single_li').on('click', function(event) {
                    $('div#mainnav ul li.active').removeAttr('class');
                    $('span.current-arrow').remove();
                    $(this).attr('class', 'active').prepend($('<span></span>', {
                        'class': 'current-arrow',
                        'html': '&nbsp;'
                    }));
                    self._trigger('0002', event, {
                        'just': 'a value'
                    });
                    return true;
                });

                $('#mainnav a#clusters_li').on('click', function(event) {
                    // todo feature placeholder
                    return true;
                });


                $('#btn_new_subset').on('click', function(event) {
                    self._trigger('0009', event, {
                        'just': 'a value'
                    });
                    return true;
                });


                $('#color_input').on('change', function() {
                    if (self.status.current_subset_edit_changemode === false) {
                        return false;
                    }

                    var cur_subset_obj = self._getSubsetObjectById(self.status.current_subset_edit_id);
                    cur_subset_obj.setColor($(this).val());
                    console.log('Handler func changed subset color');
                    return true;
                });

                $('#input_subset_name').on('change', function() {
                    if (self.status.current_subset_edit_changemode === false) {
                        return false;
                    }
                    var cur_subset_obj = self._getSubsetObjectById(self.status.current_subset_edit_id);
                    cur_subset_obj.setName($(this).val());
                    console.log('Handler func changed subset name');
                    return true;
                });


                $('button#btn_edit_done').on('click', function(event) {
                    $('#div_edit_section').modal('hide');
                });

                $('button#btn_activate_sample_section').on('click', function(event) {
                    // event passes on the event
                    self._trigger('0000', event, {
                        'just': 'a value'
                    });
                    return true;
                });

                $('button#btn_activate_subset_section').on('click', function(event) {
                    self._trigger('0001', event, {
                        'just': 'a value'
                    });
                    return true;
                });

                $('button#btn_activate_single_section').on('click', function(event) {
                    self._trigger('0002', event, {
                        'just': 'a value'
                    });
                    return true;
                });

                $('button#btn_show_freqtables').on('click', function(event) {
                    self._trigger('0021', event, {
                        'just': 'a value'
                    });
                    return true;
                });

                $(el).bind('catcluster0010', function(event, data) {
                    self._console_ux_log('0010 In subset section: User finishes subset editing');
                    console.log(data);

                    self._update_data_subset_elements(self.status.current_subset_edit_id);

                    self._update_subset_list_entry(self.status.current_subset_edit_id);
                    self._update_hc_subset_series(self.status.current_subset_edit_id);
                });
                // --------------

                // --------------
                $(el).bind('catcluster0014', function(event, data) {
                    // event: event object for manually triggered plugin event (including original event)
                    self._console_ux_log('0014 In subset section: User opens editing');
                    console.log(data);
                    console.log(event);

                    var $color_input = $('#color_input');
                    $color_input.removeData();
                    $color_input.colpick({ // http://colpick.com/plugin#options
                        layout: 'hex',
                        submit: 0,
                        colorScheme: 'dark',
                        onChange: function(hsb, hex, rgb, el, bySetColor) {
                            $(el).css('border-color', '#' + hex);
                            // Fill the text box just if the color was set using the picker, and not the colpickSetColor function.
                            if (!bySetColor) {
                                $(el).val('#' + hex);
                                $(el).trigger('change');
                            }
                        }
                    });

                    var cur_subset_id = parseInt($(event.originalEvent.target).parents('li').first().attr('id').substr(9));
                    self._edit_subset(cur_subset_id);

                    console.log('subset edit btn pressed, id: ' + cur_subset_id);
                    $('#div_edit_section').modal('show');
                    return true;
                });
                // --------------

                // --------------
                $(el).bind('catcluster0017', function(event, data) {
                    self._console_ux_log('0017 In subset section: Bring subset series to front');
                    console.log(data);
                    console.log(event);
                    var cur_subset_id = parseInt($(event.originalEvent.target).parents('li').first().attr('id').substr(9));
                    self._subset_to_front(cur_subset_id);
                    return true;
                });
                // --------------

                // --------------
                $(el).bind('catcluster0024', function(event, data) {
                    self._console_ux_log('0024 In any section: Bring sample series to front');
                    console.log(data);
                    console.log(event);
                    self._sample_to_front();
                    return true;
                });
                // --------------

                // --------------
                $(el).bind('catcluster0025', function(event, data) {
                    self._console_ux_log('0025 In single section: Bring single series to front');
                    console.log(data);
                    console.log(event);
                    self._single_to_front();
                    return true;
                });
                // --------------

                $(el).bind('catcluster0000', function(event, data) {
                    self._console_ux_log('0000 User activates sample section');
                    console.log(data);
                    console.log(event);
                    console.log(self._trigger);
                    if (self.status.current_active_section === 'sample') {
                        return false;
                    }
                    self.status.current_active_section = 'sample';

                    self._removeSeriesFromChart(self.varstack.chart_show,
                        self.varstack.chart_show.series.filter(function(el) {
                            console.log(el);
                            return (el.options.id.match(/\-(subset|single|cluster)\-/g) !== null);
                        })
                    );
                    if (self.varstack.chart_show.series.filter(function(el) {
                            return (el.options.id.match(/\-sample\-/g) !== null);
                        }).length === 0) {
                        var cur_sample_condition = new or_condition('include in sample', [true]);
                        var cur_sample_data = self._filterDataByBunchOfORconditions([cur_sample_condition]);

                        self._addSeriesToHC(self.varstack.chart_show, 'Sample distribution', self._generateNewHCSeriesData(cur_sample_data, 'Sample distribution', 'sample', '0'), 'sample', '0', {
                            'events': {
                                'show': function() {
                                    self._toggle_sample_visibility_button_status(0, 'show');
                                },
                                'hide': function() {
                                    self._toggle_sample_visibility_button_status(0, 'hide');
                                }
                            }
                        });
                    }


                    $(self.status.subset_list_obj).find('li[id^="subset_id"]').css('display', 'none');
                    $(self.status.subset_list_obj).find('li[id^="single_id"]').css('display', 'none');
                    var $get_sample_box = $(self.status.subset_list_obj).find('li[id^="sample_id"]');
                    if ($get_sample_box.length === 0) {
                        $(self.status.subset_list_obj).append(

                            $('<li></li>', {
                                'id': 'sample_id' + 0,
                                'class': 'bg-distribution-box',
                                'css': {
                                    'background-color': $(self.status.hc_obj_show).highcharts().options.colors[0],

                                    'height': '80px'
                                }
                            })
                            .append(
                                $('<div></div>', {
                                    'class': 'details'
                                })
                                .append($('<span></span>', {
                                    'class': 'big',
                                    'text': 'Sample'
                                }))
                                .append($('<span></span>', {
                                    'text': '',
                                    'class': 'small',
                                    'data-content': 'numbers'
                                }))
                                .append($('<button></button>', {
                                    'text': 'toggle visibility',
                                    'data-type': 'btn_togglevisibilty_sample',
                                    'data-status': 'show',
                                    'class': 'btn btn-default btn-xs',
                                    'html': '<span class="fs1" aria-hidden="true" data-icon="&#xe0c6;"></span>'
                                }))
                                .append($('<button></button>', {
                                    'text': 'to front',
                                    'data-type': 'btn_tofront_sample',
                                    'class': 'btn btn-default btn-xs',
                                    'html': '<span class="fs1" aria-hidden="true" data-icon="&#xe120;"></span>'
                                }))
                            )

                        );
                        self._loadFunctionality('sample_buttons');
                    }
                    self._updateCurrentSampleNumbers();
                    self._loadFunctionality('show_chart_xlabels');
                    self._toggleCreateSubsetButton((self.status.current_active_section === 'subset'));
                    self._toggleInfoText(self.status.current_active_section);
                    return true;
                });


                // --------------
                $(el).bind('catcluster0011', function(event, data) {
                    self._console_ux_log('0011 In subset section: User deletes subset');
                    console.log(data);
                    console.log(event);
                    var cur_subset_id = parseInt($(event.originalEvent.target).parents('li').first().attr('id').substr(9));
                    self._delete_subset(cur_subset_id);
                    return true;
                });
                // --------------


                // --------------
                $(el).bind('catcluster0012', function(event, data) {
                    self._console_ux_log('0012 In subset section: User toggles subset visibility');
                    console.log(data);
                    console.log(event);
                    var cur_subset_id = parseInt($(event.originalEvent.target).parents('li').first().attr('id').substr(9));
                    var hc_obj = self.varstack.chart_show.series.filter(function(el) {
                        return (el.options.id.match(new RegExp("\-subset\-" + cur_subset_id + "$", "g")) !== null);
                    })[0];
                    if (data['action'] === 'show') {
                        hc_obj.show();
                    } else {
                        hc_obj.hide();
                    }
                    return true;
                });
                // --------------

                // --------------
                $(el).bind('catcluster0022', function(event, data) {
                    self._console_ux_log('0022 In any section: User toggles sample visibility');
                    console.log(data);
                    console.log(event);
                    var hc_obj = self.varstack.chart_show.series.filter(function(el) {
                        return (el.options.id.match(new RegExp("^series\-sample\-0$", "g")) !== null);
                    })[0];
                    if (data['action'] === 'show') {
                        hc_obj.show();
                    } else {
                        hc_obj.hide();
                    }
                    return true;
                });
                // --------------

                // --------------
                $(el).bind('catcluster0023', function(event, data) {
                    self._console_ux_log('0023 In single section: User toggles single visibility');
                    console.log(data);
                    console.log(event);
                    var cur_subset_id = parseInt($(event.originalEvent.target).parents('li').first().attr('id').substr(9));
                    var hc_obj = self.varstack.chart_show.series.filter(function(el) {
                        return (el.options.id.match(new RegExp("^series\-single\-0$", "g")) !== null);
                    })[0];
                    if (data['action'] === 'show') {
                        hc_obj.show();
                    } else {
                        hc_obj.hide();
                    }
                    return true;
                });
                // --------------

                // --------------
                $(el).bind('catcluster0009', function(event, data) {
                    self._console_ux_log('0009 In subset section: User creates new subset');
                    console.log(data);
                    console.log(event);
                    self._create_subset(true);
                    return true;
                });
                // --------------

                // --------------
                $(el).bind('catcluster0001', function(event, data) {
                    self._console_ux_log('0001 User activates subset section');
                    console.log(data);
                    console.log(event);
                    if (self.status.current_active_section === 'subset') {
                        return false;
                    }
                    self.status.current_active_section = 'subset';

                    $(self.status.subset_list_obj).find('li[id^="subset_id"]').css('display', 'block');
                    $(self.status.subset_list_obj).find('li[id^="single_id"]').css('display', 'none');

                    self._removeSeriesFromChart(self.varstack.chart_show,
                        self.varstack.chart_show.series.filter(function(el) {
                            console.log(el);
                            return (el.options.id.match(/\-(subset|single|cluster)\-/g) !== null);
                        })
                    );
                    if (self.varstack.chart_show.series.filter(function(el) {
                            return (el.options.id.match(/\-sample\-/g) !== null);
                        }).length === 0) {
                        var cur_sample_condition = new or_condition('include in sample', [true]);
                        var cur_sample_data = self._filterDataByBunchOfORconditions([cur_sample_condition]);

                        self._addSeriesToHC(self.varstack.chart_show, 'Sample distribution', self._generateNewHCSeriesData(cur_sample_data, 'Sample distribution', 'sample', '0'), 'sample', '0');
                    }
                    $('li[id^="subset_id"]').each(function(cur_key, cur_value) {
                        console.log('cur_value:');
                        console.log(cur_value);
                        var $cur_value = $(cur_value);
                        var cur_subset_id = $cur_value.data()['id'];
                        var cur_subset_obj = self._getSubsetObjectById($cur_value.data()['id']);
                        self._addSeriesToHC(self.varstack.chart_show, cur_subset_obj['name'], [], 'subset', cur_subset_obj['id'], {
                            'events': {
                                'show': function() {
                                    self._toggle_subset_visibility_button_status(cur_subset_obj['id'], 'show');
                                },
                                'hide': function() {
                                    self._toggle_subset_visibility_button_status(cur_subset_obj['id'], 'hide');
                                }
                            },
                            dataLabels: {
                                enabled: false
                            }
                        });
                        self._update_hc_subset_series(cur_subset_id);
                        self._update_subset_list_entry(cur_subset_id);

                    });
                    self._toggleCreateSubsetButton((self.status.current_active_section === 'subset'));
                    self._toggleInfoText(self.status.current_active_section);
                    return true;
                });
                // --------------

                // --------------
                $(el).bind('catcluster0005', function(event, data) {
                    self._console_ux_log('0005 In sample section: User changes HOT sample selection');
                    console.log(data);
                    console.log(event);
                    self._update_hc_sample_series();
                    self._updateCurrentSampleNumbers();
                    return true;
                });
                // --------------

                // --------------
                $(el).bind('catcluster0006', function(event, data) {
                    self._console_ux_log('0006 In subset section: User changes HOT sample selection');
                    console.log(data);
                    console.log(event);
                    self._update_hc_sample_series();
                    var $all_subsets = $(self.status.subset_list_obj).find('li[id^="subset_id"]');
                    if ($all_subsets.length === 0) {
                        return false;
                    }
                    $all_subsets.each(function(key, value) {
                        var cur_id = $(value).data('id');
                        self._update_hc_subset_series(cur_id);
                        self._update_subset_list_entry(cur_id);
                    });
                    self._updateCurrentSampleNumbers();
                    return true;
                });
                // --------------

                // --------------
                $(el).bind('catcluster0007', function(event, data) {
                    self._console_ux_log('0007 In single section: User changes HOT sample selection');
                    console.log(data);
                    console.log(event);
                    self._update_hc_sample_series();

                    self._updateCurrentSampleNumbers();

                    var cur_selection = self.varstack.hot_instance.getSelected();
                    if (Object.prototype.toString.call(cur_selection) !== '[object Array]') {
                        return false;
                    }
                    if (cur_selection[0] !== cur_selection[2]) {
                        return false;
                    }
                    var row_nr = cur_selection[0];
                    if (self.varstack.myData[row_nr]['include in sample'] === true) {
                        return false;
                    }
                    self._updateCurrentSingleNumbers(false);
                    self._update_hc_single_series_to_empty('0');
                    self._HOT_afterDeselect();
                    return true;
                });
                // --------------

                // --------------
                $(el).bind('catcluster0004', function(event, data) {
                    self._console_ux_log('0004 In sample section or subset section: User clicks on single HOT line');
                    console.log(data);
                    console.log(event);
                    self._HOT_afterDeselect();
                    console.log('data source HOT:');
                    console.log(self.varstack.hot_instance);

                    var curselection_val = undefined;
                    if (data['r1'] === data['r2'] && data['p1'] === data['p2']) {
                        curselection_val = self.varstack.hot_instance.getDataAtRowProp(data['r1'], data['p1']);
                        console.log('nur eine zelle ausgewählt!');
                        console.log('Wert: ' + curselection_val);
                    } else {
                        console.log("mehrere zellen ausgewählt!");
                    }

                    if (typeof curselection_val !== 'undefined') {
                        console.log('HOT->HC translation ...');
                        if (!self.varstack.hot_hc_translator.hasOwnProperty(data['p1'])) {
                            console.log('translation failed; no such entry for selected HOT var!');
                        } else {
                            if (self.varstack.hot_hc_translator[data['p1']].hasOwnProperty(curselection_val)) {
                                console.log('translation result: categorie nr. ' + self.varstack.hot_hc_translator[data['p1']][curselection_val] + ' in var ' + data['p1']);
                                console.log(self.varstack.chart_show.series);
                                var sample_series = self.varstack.chart_show.get('series-sample-0').data;

                                var selpoint = _(sample_series).findWhere({
                                    'extra3': data['p1'],
                                    'extra2': curselection_val
                                }); // pointer: http://jsfiddle.net/qcnv4hwh/1/
                                self.status.last_selpoint = selpoint;
                                self.status.last_selpoint_mode = true;
                                console.log('HC: Now selecting point. in action 0004');
                                console.log(selpoint);
                                selpoint.select(true, false);
                                selpoint.setState('hover');
                                self.varstack.chart_show.tooltip.refresh([selpoint]);
                                // http://jsfiddle.net/gh/get/jquery/1.7.2/highslide-software/highcharts.com/tree/master/samples/highcharts/members/point-select/
                                // http://stackoverflow.com/a/11318136/2381339
                            } else {
                                console.log('translation failed; no such entry for selected HOT value!');
                            }


                        }

                    }

                });
                // --------------

                // --------------
                $(el).bind('catcluster0008', function(event, data) {
                    self._console_ux_log('0008 In single section: User selects single HOT line');
                    console.log(data);
                    console.log(event);


                    if ($(self.status.subset_list_obj).find('li[id^="single_id"]').length === 0) {
                        $(self.status.subset_list_obj).append(

                            $('<li></li>', {
                                'id': 'single_id' + 0,
                                'class': 'bg-distribution-box',
                                'css': {
                                    'background-color': self.varstack.chart_show.get('series-single-0').options.color,
                                    'height': '80px'
                                }
                            })
                            .append(
                                $('<div></div>', {
                                    'class': 'details'
                                })
                                .append($('<span></span>', {
                                    'class': 'big',
                                    'text': 'Single respondent'
                                }))
                                .append($('<span></span>', {
                                    'text': '',
                                    'class': 'small',
                                    'data-content': 'numbers'
                                }))
                                .append($('<button></button>', {
                                    'text': 'toggle visibility',
                                    'data-type': 'btn_togglevisibilty_subset',
                                    'data-status': 'show',
                                    'class': 'btn btn-default btn-xs',
                                    'html': '<span class="fs1" aria-hidden="true" data-icon="&#xe0c6;"></span>'
                                }))
                                .append($('<button></button>', {
                                    'text': 'to front',
                                    'data-type': 'btn_tofront_subset',
                                    'class': 'btn btn-default btn-xs',
                                    'html': '<span class="fs1" aria-hidden="true" data-icon="&#xe120;"></span>'
                                }))


                            )

                        );

                        self._loadFunctionality('single_buttons');

                    }


                    if (data['r1'] !== data['r2']) {
                        self._update_hc_single_series_to_empty('0');
                        self._updateCurrentSingleNumbers(false);
                        self._HOT_afterDeselect();
                        return false;
                    }
                    if (self.varstack.myData[data['r1']]['include in sample'] === false) {
                        self._update_hc_single_series_to_empty('0');
                        self._updateCurrentSingleNumbers(false);
                        self._HOT_afterDeselect();
                        return false;
                    }
                    self._update_hc_single_series('0', self.varstack.myData[data['r1']]['lfdn']);
                    self._updateCurrentSingleNumbers(true);
                    self._HOT_afterDeselect();
                    // Now highlight single point of hc single series if marked
                    if (typeof data['p1'] === 'undefined') {
                        data['p1'] = self.varstack.hot_instance.getColHeader(parseInt(data['p1_nr']));
                        data['p2'] = self.varstack.hot_instance.getColHeader(parseInt(data['p2_nr']));
                    }

                    var curselection_val;
                    if (data['p1'] !== data['p2']) {
                        return false;
                    }
                    curselection_val = self.varstack.hot_instance.getDataAtRowProp(data['r1'], data['p1']);
                    console.log('nur eine zelle ausgewählt!');
                    console.log('Wert: ' + curselection_val);

                    console.log('HOT->HC translation ...');
                    if (!self.varstack.hot_hc_translator.hasOwnProperty(data['p1'])) {
                        console.log('translation failed; no such entry for selected HOT var!');
                        return false;
                    }

                    if (!self.varstack.hot_hc_translator[data['p1']].hasOwnProperty(curselection_val)) {
                        console.log('translation failed; no such entry for selected HOT value!');
                        return false;
                    }

                    console.log('translation result: categorie nr. ' + self.varstack.hot_hc_translator[data['p1']][curselection_val] + ' in var ' + data['p1']);
                    console.log(self.varstack.chart_show.series);
                    var sample_series = self.varstack.chart_show.get('series-single-0').data;
                    console.log('before err');
                    console.log(self.varstack.chart_show.get('series-sample-0'));
                    var selpoint = _(sample_series).findWhere({
                        'extra3': data['p1'],
                        'extra2': curselection_val
                    }); // pointer: http://jsfiddle.net/qcnv4hwh/1/
                    self.status.last_selpoint = selpoint;
                    self.status.last_selpoint_mode = true;
                    console.log('HC: Now selecting point. in action 0008 ');
                    console.log(selpoint);
                    selpoint.select(true, false);
                    selpoint.setState('hover');
                    console.log('HALT 01');
                    self.varstack.chart_show.tooltip.refresh([selpoint]);
                    // http://stackoverflow.com/a/12350047/2381339 
                    // --- If the tooltip.shared=true, the parameter is array of points
                    console.log('HALT 02');
                    return true;
                });
                // --------------


                // --------------
                $(el).bind('catcluster0015', function(event, data) {
                    self._console_ux_log('0015 In sample section or subset section: User deselects line');
                    console.log(data);
                    console.log(event);
                    self._HOT_afterDeselect();
                    return true;
                });
                // --------------

                // --------------
                $(el).bind('catcluster0016', function(event, data) {
                    self._console_ux_log('0016 In single section: User deselects line');
                    console.log(data);
                    console.log(event);
                    self._update_hc_single_series_to_empty('0');
                    self._updateCurrentSingleNumbers(false);
                    return true;
                });
                // --------------

                // --------------
                $(el).bind('catcluster0002', function(event, data) {
                    self._console_ux_log('0002 User activates single section');
                    console.log(data);
                    console.log(event);
                    if (self.status.current_active_section === 'single') {
                        return false;
                    }
                    self.status.current_active_section = 'single';


                    var color = null;
                    var arr_all_used_colors = self._getAllSeriesColor();
                    var standard_colors = $(self.status.hc_obj_show).highcharts().options.colors; // http://api.highcharts.com/highcharts#colors

                    var continue_each = true;
                    _(standard_colors).each(function(value) {
                        if (continue_each === true) {
                            if (arr_all_used_colors.indexOf(value) === -1) {
                                continue_each = false;
                                color = value;
                            }
                        }

                    });

                    if (color === null) {
                        color = standard_colors[1];
                    }

                    $(self.status.subset_list_obj).find('li[id^="subset_id"]').css('display', 'none');
                    $(self.status.subset_list_obj).find('li[id^="single_id"]').css('display', 'block');

                    self._removeSeriesFromChart(self.varstack.chart_show,
                        self.varstack.chart_show.series.filter(function(el) {
                            console.log(el);
                            return (el.options.id.match(/\-(subset|cluster|single)\-/g) !== null);
                        })
                    );
                    self._addSeriesToHC(self.varstack.chart_show, 'Single respondent', [], 'single', '0', {
                        'type': 'line',
                        color: color,
                        dataLabels: {
                            enabled: false
                        },
                        'events': {
                            'show': function() {
                                self._toggle_single_visibility_button_status(0, 'show');
                            },
                            'hide': function() {
                                self._toggle_single_visibility_button_status(0, 'hide');
                            }
                        }
                    });
                    var cur_selection = self.varstack.hot_instance.getSelected();
                    /*
                     Return index of the currently selected cells as an array [startRow, startCol, endRow, endCol]. Start row
                     and start col are the coordinates of the active cell (where the selection was started).
                     */
                    if (Object.prototype.toString.call(cur_selection) === '[object Array]') {
                        self._trigger('0008', event, {
                            'r1': cur_selection[0],
                            'p1_nr': cur_selection[1],
                            'r2': cur_selection[2],
                            'p2_nr': cur_selection[3]
                        });
                    }
                    self._toggleCreateSubsetButton((self.status.current_active_section === 'subset'));
                    self._toggleInfoText(self.status.current_active_section);
                    return true;
                });
                // --------------

                // --------------
                $(el).bind('catcluster0021', function(event, data) {
                    self._console_ux_log('0021 In all sections: User wants freq table(s)');
                    console.log(data);
                    console.log(event);
                    var values;
                    var $target_obj = $(event.originalEvent.target);
                    if ($target_obj.attr('data-type') === 'xlabel') { // Click on single variable
                        values = self._getFreqTableByVarname($target_obj.attr('data-varname'), self.varstack.chart_show, true);

                        if (values === false) {
                            return false;
                        }

                        $('#freq_area').empty().append(
                            values
                        );

                    } else {
                        values = self._getFreqTableByVarname(o.catvar_list[0], self.varstack.chart_show, true);

                        if (values === false) {
                            return false;
                        }

                        $('#freq_area').empty();
                        _(o.catvar_list).each(function(value, key) {
                            $('#freq_area').append(
                                self._getFreqTableByVarname(value, self.varstack.chart_show, true)
                            );
                        });
                    }
                    $('#div_freq_section').modal('show');
                    return true;
                });
                // --------------


                $('#div_edit_section').on('hide.bs.modal', function(event) {
                    self._trigger('0010', null, {
                        'just': 'a value'
                    });
                    return true;
                });


            }

        },


        _toggleInfoText: function(item) {
            var self = this,
                o = this.options,
                el = this.element;
            var obj = {
                'sample': "<p>Welcome to the <b>sample section</b>.</p>" +
                    "<p>In this section of the app, only the <b>sample distribution</b> is shown in the chart.</p>" +
                    "<p>By using the <b>checkboxes</b> in the table column on the left, you can decide which respondents shall be part of your sample. " +
                    "Remember that the chart only shows respondents who are <b>part of the sample</b>.</p>" +
                    "<p>When clicking on a <b>single categorical value</b> of a sample respondent in the table, the corresponding value will highlight in the chart.</p>",
                'single': "<p>In the <b>single section</b>, you can take a look at a single repondent's answers.</p>" +
                    "<p>Just click <b>on a row in the table</b> and a new line will appear in the chart. The respondent must be <b>part of the current sample</b>.</p>",
                'subset': "<p>Subsetting means defining <b>subgroups of respondents</b>, dependending on their answers.</p>" +
                    "<p>A subset can be created by selecting conditions such as \"<b>(v_1 == 2 OR v_1 == 3)</b>\". Each condition is linked with an AND operator. Try it by clicking on the button \"<b>Define new subset</b>\".</p>" +
                    "<p>Another feature are <b>frequency tables</b>: When you have created your individual subsets, it is easy to compare their value distribution by clicking on the button \"<b>Show frequency tables</b>\".</p>"
            };
            $('span#infotext').html(obj[item]);
            return true;
        },

        _toggleCreateSubsetButton: function(state) {
            var self = this,
                o = this.options,
                el = this.element;
            //alert(state);
            var value = (state) ? 'block' : 'none';
            $(self.status.subset_list_obj).parents('.col-lg-3').first().find('button#btn_new_subset').css('display', value);
            return true;
        },

        _update_hc_single_series_to_empty: function(single_id) {
            var self = this,
                o = this.options,
                el = this.element;
            // arg single id is a dummy feature (in case there will be several single series in future)

            // Update single series to zero data and no lfdn, set it to hidden
            var check_series_existence = self.varstack.chart_show.get('series-single-' + single_id); // returns null if nothing found: http://jsfiddle.net/avdfp7ou/
            console.log('CHECKING' + 'series-single-' + single_id);
            console.log(check_series_existence);
            self._update_hc_series(check_series_existence, [], {
                'name': 'Single respondent',
                visible: false
            });
            return true;
        },

        _update_hc_single_series: function(single_id, lfdn) {
            var self = this,
                o = this.options,
                el = this.element;
            // arg single id is a dummy feature (in case there will be several single series in future)

            var or_conditions = [new or_condition('include in sample', [true]), new or_condition('lfdn', [lfdn])];
            var name = 'Single respondent (lfdn = ' + lfdn + ')';
            var subset_data = self._filterDataByBunchOfORconditions(or_conditions);
            console.log(subset_data);
            var hc_data_set = self._generateNewHCSeriesData(subset_data, name, 'single', single_id);
            var check_series_existence = self.varstack.chart_show.get('series-single-' + single_id); // returns null if nothing found: http://jsfiddle.net/avdfp7ou/
            self._update_hc_series(check_series_existence, hc_data_set, {
                'name': name,
                visible: true
            });
            return true;
        },


        _delete_subset: function(subset_id) {
            var self = this,
                o = this.options,
                el = this.element;

            var $cur_subset_obj = $(self.status.subset_list_obj).find('li[id="subset_id' + subset_id + '"]').first();
            if ($cur_subset_obj.length === 0) {
                return false;
            }

            // todo: maybe include a "really delete?" prompt
            $cur_subset_obj.remove();

            self._removeSeriesFromChart(self.varstack.chart_show,
                self.varstack.chart_show.series.filter(function(el) {
                    return (el.options.id.match(new RegExp("\-subset\-" + subset_id + "$", "g")) !== null);
                })
            );

            self._remove_subset_from_data(subset_id);


            return true;
        },

        _console_ux_log: function(message) {
            console.log('%c UX --- ' + message + ' --- ', 'background: #222; color: lightblue');
            return true;
        },

        _highlightSeriesBubblesByOrConditionSet: function(series_pointer, or_condition_array) {
            var self = this,
                o = this.options,
                el = this.element;
            console.log('--- CatCluster: _highlightSeriesBubblesByOrConditionSet');
            console.log(or_condition_array);
            var highlight_indexes = [],
                unhighlight_indexes = [];
            for (var i = 0; i < series_pointer.length; i++) {
                var cur_data_point = series_pointer[i];
                var cur_var = cur_data_point['extra3'];
                var cur_value = cur_data_point['extra2'];

                if (or_condition_array.filter(function(el) {
                        return (el['var'] === cur_var && el['accepted_values'].indexOf(cur_value) !== -1)
                    }).length > 0) {
                    highlight_indexes.push(i);
                } else {
                    unhighlight_indexes.push(i);
                }
            }

            console.log('this is highlight:');
            console.log(highlight_indexes);
            console.log('this is unhighlight:');
            console.log(unhighlight_indexes);

            for (i = 0; i < highlight_indexes.length; i++) {
                series_pointer[highlight_indexes[i]].select(true, true);
            }

            for (i = 0; i < unhighlight_indexes.length; i++) {
                series_pointer[unhighlight_indexes[i]].select(false, true);
            }


        },


        _filterDataByBunchOfORconditions: function(query_arr, data_arr) {
            var self = this,
                o = this.options,
                el = this.element;
            if (typeof data_arr === 'undefined') {
                data_arr = self.varstack.myData;
            }
            var result = data_arr.filter(function(el) {

                // Diese Schleife iteriert durch sämtliche OR-Conditions (agiert wie AND)
                for (var i = 0; i < query_arr.length; i++) {
                    var cur_or_condition = query_arr[i];
                    if (cur_or_condition['accepted_values'].indexOf(el[cur_or_condition['var']]) === -1) {
                        return false;
                    }
                }
                return true;
            });
            return result;
        },

        _filterDataBySubsetID: function(query_obj, data_arr) {
            var self = this,
                o = this.options,
                el = this.element;
            if (typeof data_arr === 'undefined') {
                data_arr = self.varstack.myData;
            }
            var result = data_arr.filter(function(el) {
                return (el['part of subsets'].indexOf(query_obj['id']) !== -1);
            });
            return result;
        },

        _updateDomElementWithTemplateContent: function(tmpl_string, content_obj) {
            for (var attrname in content_obj) {
                tmpl_string = tmpl_string.replace_all('{{' + attrname + '}}', content_obj[attrname]);
            }
            return tmpl_string;
        },

        _updateCurrentSampleNumbers: function() {
            var self = this,
                o = this.options,
                el = this.element;
            console.log('updating....');
            var overall_val = self.varstack.myData.length;
            var insample_val = self._filterDataByBunchOfORconditions(
                [new or_condition('include in sample', [true])]
            ).length;
            var update_text = self._updateDomElementWithTemplateContent('{{OVERALL}} respondents in data table, {{INSAMPLE}} in current sample', {
                'OVERALL': overall_val,
                'INSAMPLE': insample_val
            });
            $("span#tmpl_current_sample_numbers").text(update_text);
            console.log($(self.status.subset_list_obj).find('li#sample_id0 div span[data-content="numbers"]'));
            $(self.status.subset_list_obj).find('li#sample_id0 div span[data-content="numbers"]').text(insample_val + ' sample respondents');
            return true;
        },

        _updateCurrentSingleNumbers: function(zero_or_one) {
            var self = this,
                o = this.options,
                el = this.element;
            var nr = (zero_or_one) ? 1 : 0;
            $(self.status.subset_list_obj).find('li#single_id0 div span.small').text(nr + ' sample respondents');
            return true;
        },


        _getFreqTableByVarname: function(var_name, chart_instance, treat_missing_as_invalid) {
            var self = this,
                o = this.options,
                el = this.element;

            var output_arr = []; // Each element = one row
            output_arr.push({
                'group': 'group',
                'validity': 'validity',
                'value': 'value',
                'frequency': 'frequency',
                'percent': 'percent',
                'valid percent': 'valid percent',
                'cumulated percent': 'cumulated percent'
            });

            if (treat_missing_as_invalid === false) {
                delete output_arr[0]['valid percent'];
            }

            var series_stack = [];
            var all_series = chart_instance.series;
            _(all_series).each(function(value, key) {
                if (value.visible === true) {
                    series_stack.push(value);
                }
            });

            if (series_stack.length === 0) {
                alert('error: no visible series in chart instance!');
                return false;
            }

            var points_var;
            var all_freq_sum;
            var missing_freq_sum;
            var get_missing;
            var valid_freq_sum;
            var valid_percentage_per_case;
            var all_percentage_per_case;
            var sorted_arr;
            var cur_val;
            var stvar;
            var cum_percentage;
            var get_point;
            var group_set;
            _(series_stack).each(function(value, key) {
                points_var = _(value['data']).where({
                    'extra3': var_name
                });
                if (points_var.length === 0) {
                    return false;
                }
                all_freq_sum = points_var.sum_by_single_property('z');


                missing_freq_sum = 0;

                if (treat_missing_as_invalid === true) {
                    get_missing = _(points_var).where({
                        'extra2': o.catvar_missing_value
                    });
                    if (get_missing.length === 1) {
                        missing_freq_sum = get_missing[0]['z'];
                    }
                }
                valid_freq_sum = all_freq_sum - missing_freq_sum;
                valid_percentage_per_case = 100 / valid_freq_sum;
                all_percentage_per_case = 100 / all_freq_sum;

                // sortieren nach index in hc_translator (Reihenfolge wie im Chart!)
                sorted_arr = self._sortObjByPropValueDesc(self.varstack.hot_hc_translator[var_name]);


                cum_percentage = 0;
                group_set = false;
                _(sorted_arr).each(function(value2, key2) {
                    cur_val = value2[0];
                    stvar = false;
                    if (treat_missing_as_invalid === true) {
                        if (cur_val !== o.catvar_missing_value) {
                            stvar = true;
                        }
                    } else {
                        stvar = true;
                    }
                    if (stvar === true) {
                        // Zeile schreiben für cur_val, falls Wert > 0 ==> _(points_var).where( { 'extra2': cur_val }); falls Array ===>Häufigkeit: Element[0]['z']
                        get_point = _(points_var).where({
                            'extra2': cur_val
                        });
                        if (get_point.length === 1) {
                            cum_percentage += ((treat_missing_as_invalid === true) ? valid_percentage_per_case : all_percentage_per_case) * get_point[0]['z'];
                            output_arr.push({

                                'value': cur_val + ' (' + o.data_labels[var_name][cur_val] + ')',
                                'frequency': get_point[0]['z'],
                                'percent': (get_point[0]['z'] * all_percentage_per_case).toFixed(2) + '%',
                                'valid percent': (get_point[0]['z'] * valid_percentage_per_case).toFixed(2) + '%',
                                'cumulated percent': cum_percentage.toFixed(2) + '%'
                            });
                            if (group_set === false) {
                                group_set = true;
                                output_arr[output_arr.length - 1]['group'] = value.name;
                                if (treat_missing_as_invalid === true) {
                                    output_arr[output_arr.length - 1]['validity'] = 'valid';
                                }
                            }
                        }
                    }
                });

                if (treat_missing_as_invalid === true) {
                    // Zeile schreiben für o.catvar_missing_value, falls missing_freq_sum > 0
                    get_point = _(points_var).where({
                        'extra2': o.catvar_missing_value
                    });
                    if (get_point.length === 1) {

                        output_arr.push({
                            'value': o.catvar_missing_value + ' (' + o.data_labels[var_name][o.catvar_missing_value] + ')',
                            'frequency': get_point[0]['z'],
                            'percent': (get_point[0]['z'] * all_percentage_per_case).toFixed(2) + '%',
                            'validity': 'invalid'
                        });
                        if (group_set === false) {
                            group_set = true;
                            output_arr[output_arr.length - 1]['group'] = value.name;
                        }
                    }
                }

                output_arr.push({
                    'frequency': all_freq_sum,
                    'percent': '100%',
                    'validity': 'Total'
                });
            });
            console.log(output_arr);
            return ($('<div></div>').append($('<span></span>', {
                'text': var_name + ': ' + o.var_labels[var_name],
                'css': {
                    'display': 'block',
                    'margin-top': '10px'
                }
            })).append(self._generateTableFromFreqElement(output_arr)));
        },


        _generateTableFromFreqElement: function(freq_element) {
            var cur_row;
            var cols = [];
            var continue_state;
            var $table_element = $('<table></table>', {
                'css': {
                    'border': '1px solid #CCCCCC',
                    'border-collapse': 'collapse'
                }
            });
            _(freq_element).each(function(value, key) {
                cur_row = value;
                continue_state = true;
                var $row_element = $('<tr></tr>');
                if (key === 0) {
                    for (var attrname in cur_row) {
                        cols.push(attrname);

                        $row_element.append(
                            $('<th></th>',


                                {
                                    'text': cur_row[attrname],
                                    'css': {
                                        'border': '1px solid #CCCCCC',
                                        'border-collapse': 'collapse',
                                        'padding': '3px'
                                    }
                                }));
                    }
                    continue_state = false;
                }
                if (continue_state === true) {
                    _(cols).each(function(value2, key2) {
                        $row_element.append(
                            $('<td></td>', {
                                'text': (cur_row.hasOwnProperty(value2)) ? cur_row[value2] : '',
                                'css': {
                                    'border': '1px solid #CCCCCC',
                                    'border-collapse': 'collapse',
                                    'padding': '3px'
                                }
                            }));
                    });
                }
                $table_element.append($row_element);
            });
            return $table_element;
        }

    });
})(jQuery);


$(window).on('load', function() {
    $('#qbplugin').CatCluster({});
});


window.onbeforeunload = function(e) {
    return 'Your subsets and clusters will be lost when leaving the page.';
};