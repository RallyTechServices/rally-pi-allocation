Ext.define('CustomApp', {
    extend: 'Rally.app.App',
    componentCls: 'app',
    logger: new Rally.technicalservices.logger(),
    _selected_base_records: [],
    _direct_children: [],
    _selected_iteration: null,
    _selected_tags: [],
    category_field_name: "c_Category",
    items: [
    {
        xtype:'container',
        itemId:'selector_box',
        padding:5,
        layout:{type:'hbox'},
        defaults: { margin: 5 },
        items: [
            {xtype:'container',itemId:'pi_selector_box'},
            {xtype:'container',itemId:'chart_selector_box'},
            {xtype:'container',items:[
                {xtype:'container',itemId:'iteration_selector_box'},
                {xtype:'container',itemId:'tag_selector_box'}
            ]}
        ]
    },
    {
        xtype:'container',
        itemId:'configuration_reporter_box',
        defaults: { margin: 5 },
        padding: 5,
        items: [
            {
                xtype:'container',
                itemId:'selected_pi_box'
            },
            {
                xtype:'container',
                itemId:'selected_iteration_box'
            },
            {
                xtype:'container',
                itemId:'selected_tag_box'
            },
            {
                xtype:'container',
                itemId:'selected_metric_box'
            }
        ]
    },
    { 
        xtype:'container',
        layout: {type:'hbox'},
        margin: 5,
        items:[
            {
                xtype:'container',
                itemId:'actual_chart_box',
                /*width: 600, */
                height: 500
            }/*,
            {
                xtype:'container',
                itemId:'target_chart_box',
                width: 600, 
                height: 500
            }*/
        ]
    }],
    launch: function() {
        this._addSelectors();
    },
    _addSelectors: function() {
        this._addTypePicker();
        this._addPIButton();
        
        this._addIterationDatePickers();
        this._addTagPicker();

        this._addMetricPicker();
        this._addChartButton();
    },
    _addTagPicker: function() {
        var me = this;
        this.down('#tag_selector_box').add({
            itemId:'tag_selector',
            xtype: 'rallytagpicker',
            fieldLabel: 'with tag(s)',
            autoExpand: false,
            listeners: {
                selectionchange: function() {
                    me._populateConfigurationReporter();
                }
            }
        });
    },
    _addTypePicker: function() {
        var me = this;
        this.down('#pi_selector_box').add({
            itemId: 'type_selector',
            xtype: 'rallyportfolioitemtypecombobox',
            fieldLabel: 'PI Type:',
            storeConfig: {
                filters: [{"property":"Ordinal","operator":">","value":0}]
            },
            labelWidth: 50,
            listeners: {
                change: function() {
                    me._selected_base_records = [];
                    me._populateConfigurationReporter();
                }
            }
        });
    },
    _addMetricPicker: function() {
        var me = this;
        var metrics = Ext.create('Ext.data.Store', {
            fields: ['name', 'value'],
            data : [
                {"name":"By Points", "value":"points"},
                {"name":"By Count", "value":"count"},
                {"name":"By Hours", "value":"hours"},
                {"name":"By Cost","value":"cost"}
            ]
        });
        
        var stacks = Ext.create('Ext.data.Store', {
            fields: ['name', 'value'],
            data : [
                {"name":"By Child", "value":"child"},
                {"name":"By Category", "value":"category"}
            ]
        });
        
        this.down('#chart_selector_box').add({
            itemId: 'metric_selector',
            xtype: 'combobox',
            fieldLabel: 'Chart metric:',
            store: metrics,
            displayField: 'name',
            valueField:'value',
            labelWidth: 50,
            listeners: {
                change: function() {
                    me._populateConfigurationReporter();
                }
            }
        }).setValue('points');
        this.down('#chart_selector_box').add({
            itemId: 'stack_selector',
            xtype: 'combobox',
            fieldLabel: 'Stack:',
            store: stacks,
            displayField: 'name',
            valueField:'value',
            labelWidth: 50,
            listeners: {
                change: function() {
                    me._populateConfigurationReporter();
                }
            }
        }).setValue('child');
        this.down('#chart_selector_box').add({
            itemId: 'cost_selector',
            xtype: 'rallynumberfield',
            fieldLabel: 'Cost Multiplier ($):',
            labelWidth: 50,
            listeners: {
                change: function() {
                    me._populateConfigurationReporter();
                }
            }
        }).setValue(125);
    },
    _addIterationDatePickers: function() {
        var me = this;
        this.down('#iteration_selector_box').add({
            itemId:'iteration_start_selector',
            xtype:'rallydatefield',
            fieldLabel:'Iterations starting after',
            listeners: {
                change: function() {
                    me._populateConfigurationReporter();
                }
            }
        });
        this.down('#iteration_selector_box').add({
            itemId:'iteration_end_selector',
            xtype:'rallydatefield',
            fieldLabel:'Iterations ending before',
            listeners: {
                change: function() {
                    me._populateConfigurationReporter();
                }
            }
        });
    },
    _addIterationPicker: function() {
        var me = this;
        this.down('#iteration_selector_box').add({
            xtype: 'rallyiterationcombobox',
            itemId: 'iteration_selector',
            fieldLabel: 'From iteration:',
            labelWidth:50,
            allowNoEntry:true,
            listeners: {
                change: function() {
                    me._populateConfigurationReporter();
                }
            }
        });
    },
    _addPIButton: function() {
        var me = this;
        this.down('#pi_selector_box').add({
            xtype:'rallybutton',
            text:'Choose Portfolio Item(s)',
            handler: me._launchPIPicker,
            scope: me
        });
    },
    _addChartButton: function(){
        var me = this;
        this.down('#chart_selector_box').add({
            itemId:'draw_chart_button',
            xtype:'rallybutton',
            text:'Draw Chart',
            disabled: true,
            handler: me._getData,
            scope: me
        });
    },
    _getData: function() {
        var me = this;
        this.down('#actual_chart_box').removeAll();
        
        //if ( this.actual_chart ) { this.actual_chart.destroy(); }
        
        // for each selected top record, find all the descendants
        Ext.Array.each(me._selected_base_records,function(base_record){
            var options = {
                pi: base_record,
                iteration: me._selected_iteration,
                iteration_start: Rally.util.DateTime.format(me.down('#iteration_start_selector').getValue(), 'Y-MM-dd'),
                iteration_end: Rally.util.DateTime.format(me.down('#iteration_end_selector').getValue(), 'Y-MM-dd'),
                tags: me._selected_tags,
                stack: me.down('#stack_selector').getValue()
            };
    
            me.logger.log(me,"options",options);
            me._direct_children = {};
            
            if ( options.pi.get('PortfolioItemType').Ordinal === 0 ) {
                // we have a feature level item, so do stories instead of children
                me.logger.log(this,"Not yet!");
            } else {
                options.pi.getCollection('Children',{
                    fetch:['Tags','Children','Name','FormattedID','TypePath','PortfolioItemType','Ordinal','ObjectID',me.category_field_name]
                }).load({
                    callback: function(records,operation,success){
                        if ( records.length === 0 ) {
                            me.down('#actual_chart_box').add({
                                xtype:'container',
                                html:'No descendants: ' + base_record.get('Name')
                            });
                        } else {
                            
                            Ext.Array.each(records,function(record){
                                me._direct_children[record.get('FormattedID')] = record;
                                record.set('_selected_pi',options.pi);
                                var key = record.get('FormattedID');
                                me._findDescendants(key,options,[record]);
                            });
                        }
                    }
                });
            }
        });
       
    },
    _populateConfigurationReporter: function() {
        var me = this;
        this.down('#actual_chart_box').removeAll();
        
        
        //me._selected_iteration = me.down('#iteration_selector').getRecord();
        
        var iteration_message = "In progress items regardless of iteration";
        if ( me._selected_iteration && me._selected_iteration.get('Name') !== "" ) {
            iteration_message = "In progress items associated with iterations named " + me._selected_iteration.get('Name');
        }

        var iteration_start_date = Rally.util.DateTime.format(me.down('#iteration_start_selector').getValue(), 'D, M d, Y');
        var iteration_end_date = Rally.util.DateTime.format(me.down('#iteration_end_selector').getValue(), 'D, M d, Y');
        if ( iteration_start_date  && iteration_end_date ) {
            iteration_message =  "In progress items associated with iterations starting after " +
                    iteration_start_date + " and ending before " + iteration_end_date;
        } else if ( iteration_start_date ) {
            iteration_message =  "In progress items associated with iterations starting after " + iteration_start_date;
        } else if ( iteration_end_date ) {
            iteration_message =  "In progress items associated with iterations ending before " + iteration_end_date;
        }
        
        
        me._selected_tags = [];
        Ext.Array.each(this.down('#tag_selector').getValue(),function(tag){
            me._selected_tags.push(tag.get('Name'));
        });
        var tag_message = "&nbsp;&nbsp;and regardless of tag";
        if ( me._selected_tags.length === 1 ) {
            tag_message = "&nbsp;&nbsp;and with tag named " + me._selected_tags[0];
        } else if ( me._selected_tags.length > 1 ) {
            tag_message = "&nbsp;&nbsp;and with one of these tags: " + me._selected_tags.join(',');
        }
        
        var metric_message = "&nbsp;&nbsp;&nbsp;&nbsp;Display by " + me.down('#metric_selector').getValue();

                
        if ( me._selected_base_records.length > 0 ) {
            var pi_names = [];
            Ext.Array.each(me._selected_base_records,function(record){
                pi_names.push(record.get('Name'));
            });
            me.down('#selected_pi_box').update("For " + 
                me.down('#type_selector').getRecord().get('ElementName') + "(s) " +
                pi_names.join(', ') + ", find:");
            me.down('#selected_metric_box').update(metric_message);
            me.down('#selected_iteration_box').update(iteration_message);
            me.down('#selected_tag_box').update(tag_message);
        } else {
            me.down('#selected_pi_box').update("No PI chosen.");
        }
        
    },
    _launchPIPicker: function() {
        var me = this;
        this.logger.log(this, "launch PI Picker");
        
        this.dialog = Ext.create('Rally.ui.dialog.ChooserDialog', {
            artifactTypes: [me.down('#type_selector').getRecord().get('TypePath')],
            filterableFields: [
                {displayName: 'ID', attributeName:"FormattedID"},
                {displayName: 'Name', attributeName:"Name"}
            ],
            columns: [
                {text:'id',dataIndex:'FormattedID'},
                {text:'Name',dataIndex:'Name',flex: 1}
            ],
            storeConfig: {
                fetch:['Children','UserStories','Name','FormattedID','TypePath','PortfolioItemType','Ordinal','ObjectID','Tags']
            },
            autoShow: true,
            height: 500,
            title: 'Choose a PI',
            multiple: true,
            listeners: {
                artifactChosen: function(selectedRecord){
                    var records = me.dialog._getSelectedRecords();
                    me._selected_base_records = records;
                    if ( me._selected_base_records.length > 0 ) {
                        me.down('#draw_chart_button').setDisabled(false);
                    } else {
                        me.down('#draw_chart_button').setDisabled(true);
                    }
                    me._populateConfigurationReporter();
                },
                scope: this
            }/*,
            buttons: [{
                xtype:'rallybutton',
                text:'Select',
                userAction:'clicked done in dialog',
                handler:function(){
                    
                    me.dialog.close();
                },
                scope: me
            },
            {
                xtype:'rallybutton',
                text:'Cancel',
                userAction:'clicked done in dialog',
                handler:function(){
                    if ( me._selected_base_records.length > 0 ) {
                        me.down('#draw_chart_button').setDisabled(false);
                    } else {
                        me.down('#draw_chart_button').setDisabled(true);
                    }
                    me._populateConfigurationReporter();
                    me.dialog.close();
                },
                scope: me
            }]*/
         });
    },
    _findDescendants: function(key,options,records){
        var me = this;
        me.logger.log(this,'_findDescendants for ',key,options,records);
        var type_name = null;
        
        if ( records.length === 0 ) {
            me.logger.log(this,"No path to stories",options);
            me._direct_children[key].set('_leaves',[]);
        } else {
            var first_record = records[0];
            var pi_level = first_record.get('PortfolioItemType').Ordinal;
            options.type_name = first_record.get('PortfolioItemType').Name;
            // 0 is lowest level (e.g., feature)
            me.logger.log(this,'pi level ' + pi_level);
            if ( pi_level !== 0 ) {
                // get children PIs
                var all_children = [];
                var callback_counter = 0;
                var no_children_found = true;
                Ext.Array.each(records, function(record){
                    var children = record.get('Children');
                    if ( children.Count > 0 ) {
                        callback_counter += 1;
                        no_children_found = false;
                        record.getCollection('Children',{fetch:['Tags','Children','Name','FormattedID','TypePath','PortfolioItemType','Ordinal','ObjectID']}).load({
                            callback: function(records,operation,success){
                                Ext.Array.push(all_children,records);
                                callback_counter -= 1;
                                me.logger.log(this,'counter ' + callback_counter);
                                if (callback_counter<=0) {
                                    me._findDescendants(key,options,all_children);
                                }
                            }
                        });
                    }
                });
                if (no_children_found) { me._findDescendants(key,options,[]); }
            } else {
                // get children stories                
                me._limitPIsToSelectedTags(key,options,records);
            }
        }
    },
    _getStories: function(key,options,records){
        
        var field_name = "PortfolioItemRelease";
        if ( options.type_name !== "Release" ) {
            field_name = options.type_name;
        }
        var me = this;
        me.logger.log(this,"Getting stories related to " + key);
        var oid_filters = Ext.create('Rally.data.QueryFilter',{
            property:field_name+".ObjectID",
            operator:'=',
            value:records[0].get('ObjectID')
        });
        Ext.Array.each(records,function(record,idx){
            if (idx>0) {
                oid_filters = oid_filters.or(Ext.create('Rally.data.QueryFilter',{
                    property:field_name+".ObjectID",
                    operator:'=',
                    value:record.get('ObjectID')
                }));
            }
        });
        var filters = Ext.create('Rally.data.QueryFilter',{property:"DirectChildrenCount",operator:'=',value:0});
        filters = filters.and(Ext.create('Rally.data.QueryFilter',{property:'ScheduleState',operator:'>',value:'Defined'}));
        
        if ( options.iteration && options.iteration.get('Name') !== "") {
            filters = filters.and(Ext.create('Rally.data.QueryFilter',{
                property:'Iteration.Name',
                value: options.iteration.get('Name')
            }));
        }
        
        if ( options.iteration_start ) {
            filters = filters.and(Ext.create('Rally.data.QueryFilter',{
                property: 'Iteration.StartDate',
                operator: ">=",
                value: options.iteration_start
            }));
        }
        
        if ( options.iteration_end ) {
            filters = filters.and(Ext.create('Rally.data.QueryFilter',{
                property: 'Iteration.EndDate',
                operator: "<=",
                value: options.iteration_end
            }));
        }
        
        filters = filters.and(oid_filters);
        
        me.logger.log(this,"filters",filters.toString());
        Ext.create('Rally.data.WsapiDataStore',{
            model:'UserStory',
            filters: filters,
            fetch: ['Name','PlanEstimate','ScheduleState','TaskEstimateTotal'],
            autoLoad: true,
            listeners: {
                load: function(store,records) {
                    me.logger.log(this,"Stories for " + key,records);
                    
                    me._direct_children[key].set("_leaves",records);
                    me._direct_children[key].set('_selected_pi',options.pi);
                    
                    var waiter = null;
                    for ( var i in me._direct_children ) {
                        if ( ! me._direct_children[i].get('_leaves') ) {
                            waiter = i;
                        }
                    }
                    me.logger.log(this,"_leaves",me._direct_children);
                    if ( waiter !== null ) {
                        me.logger.log(this,"Still waiting for " + waiter);
                    } else { 
                        me._makeBarChart();
                    }
                }
            }
        });
    },
    _limitPIsToSelectedTags: function(key,options,records){
        var me = this;
        me.logger.log(this,'_limitPIsToSelectedTags',key,options,records);
        var filtered_records = [];
        if ( options.tags.length === 0 ) {
            me._getStories(key,options,records);
        } else { 
            var callback_counter = 0;
            var any_tags_found = false;
            Ext.Array.each(records, function(record){
                var tags = record.get('Tags');
                me.logger.log(this,tags,record);
                if ( tags.Count > 0 ) {
                    any_tags_found = true;
                    callback_counter += 1;
                    record.getCollection('Tags',{fetch:['Name']}).load({
                        callback: function(tag_records,operation,success){
                            me.logger.log(this,"has tags",tag_records);
                            callback_counter -= 1;
                            me.logger.log(this,'counter ' + callback_counter);
                            Ext.Array.each(tag_records,function(tag_record) {
                                if (Ext.Array.indexOf(options.tags,tag_record.get('Name')) > -1) {
                                    filtered_records.push(record);
                                    return;
                                }
                            });
                            if (callback_counter<=0) {
                                if ( filtered_records.length === 0 ) {
                                    me.logger.log(this,"Has tags, but not the right ones, REMOVING",key);
                                    delete me._direct_children[key];
                                    //me._direct_children[key].set("_leaves",[]);
                                } else { 
                                     me._getStories(key,options,filtered_records);
                                }
                            }
                        }
                    });
                }
            });
            if ( !any_tags_found ) {
                me.logger.log(this,"Has no tags, so REMOVING",key);
                delete me._direct_children[key];
                //me._direct_children[key].set("_leaves",[]);
            }
        }
    },
    // given an array of direct children, return a hash where the 
    // key is the direct child name
    // and value is the size (depending on metric chosen) for that item
    _calculateDataForChart: function(direct_children) {
        var me = this;
        me.logger.log(this,"_calculateDataForChart");
        var chart_data = {};
        
        var metric = this.down('#metric_selector').getValue();
        Ext.Object.each(direct_children,function(key,child){
            var pi_key = child.get('_selected_pi').get('Name');

            if ( !chart_data[pi_key] ) {
                chart_data[pi_key] = {};
            }
            
            var data_key = child.get('Name');
            if (  me.down('#stack_selector').getValue() === "category" ) {
                data_key = child.get(me.category_field_name) || "Other";
            }
            if ( ! chart_data[pi_key][data_key]) {
                chart_data[pi_key][data_key] = 0;
            }
            var leaves = child.get('_leaves');

            Ext.Array.each(leaves,function(leaf){
                var size = leaf.get('PlanEstimate')||0;
                if ( metric === 'count' ) {
                    size = 1;
                } else if ( metric === 'hours' ) {
                    size = leaf.get('TaskEstimateTotal') || 0;
                } else if ( metric === 'cost' ) {
                    var hours = leaf.get('TaskEstimateTotal') || 0;
                    size = hours * me.down('#cost_selector').getValue();
                }
                chart_data[pi_key][data_key] += size;
                
            });
        });
        return chart_data;
    },
    _makeBarChart: function() {
        var me = this;
        me.logger.log(this,"_makeBarChart");
        var chart_data = {};
        
        var chart_data = me._calculateDataForChart(me._direct_children);
        
        if ( Ext.Object.getKeys(chart_data).length === 0 ) {
            me.actual_chart = this.down('#actual_chart_box').add({
                xtype:'container',
                html:'No points found'
            });
        } else {
            
            var series_hash = [];
            var series = [];
            var x_categories = [];
            var y_categories = [];
            
            Ext.Object.each(chart_data,function(pi_key,value){
                x_categories.push(pi_key);
                y_categories = Ext.Array.merge(y_categories,Ext.Object.getKeys(value));
            });
            
            y_categories = y_categories.sort();
            x_categories = x_categories.sort();
            
            Ext.Array.each(y_categories,function(category){
                series_hash[category] = {type:'column',name:category,data:[], stack: 1};
            });
            
            this.logger.log(me,'x categories',x_categories);
            this.logger.log(me,'y categories',y_categories);
            this.logger.log(me,'series hash', series_hash);
            
            // want to put the x items in alpha order
            var x_keys = [];
            x_keys = Ext.Object.getKeys(chart_data).sort();
            
            this.logger.log(me,'keys',x_keys);
            
            Ext.Array.each(x_keys, function(x_key) {
                var record_chart_data = chart_data[x_key];
//            Ext.Object.each(chart_data, function(top_record,record_chart_data){
                Ext.Array.each(y_categories,function(category){
                    var data_point = null;
                    if ( record_chart_data[category] ) {
                        data_point = record_chart_data[category];
                    }
                    if (me.down('#metric_selector').getValue() === "cost" ) { 
                        data_point = {
                            dataLabels: {
                                formatter: function() {
                                    return '$'+this.y;
                                },
                                enabled: true,
                                align: 'left',
                                style: {
                                    fontWeight: 'bold'
                                }
                            },
                            y: record_chart_data[category]
                                
                        }
                    }
                    series_hash[category].data.push(data_point);
                });
                //var name = Ext.util.Format.ellipsis(key,28,true);
            });
            
            Ext.Object.each(series_hash,function(key,value){ series.push(value);});
            
            var column_width = null; // let page define
            if (x_categories.length < 10) {
                column_width = 60;
            }
            
            me.actual_chart = this.down('#actual_chart_box').add({
                xtype:'rallychart',
                chartData: {
                    series: series,
                    categories: x_categories
                },
                chartConfig: {
                    chart: {
                        width: me.getWidth()
                    },
                    title: {
                        text: '',
                        align: 'center'
                    },
                    xAxis: [{
                        categories:x_categories,
                        labels: {
                            align: 'right',
                            rotation: -90,
                            
                            formatter: function() {
                                return me._splitString(this.value,25);
                            }
                        }
                    }],
                    plotOptions: {
                        column: {
                            stacking: 'normal'
                        },
                        series: {
                            groupPadding: 0,
                            pointWidth: column_width
                        }
                    },
                    yAxis: [{title:{text:''}}]
                }
            });
        }
    },
    _splitString: function(value,len){
        var me = this;
        if (value && value.length > len) {
            var vs = value.substr(0, len - 2),
            index = Math.max(vs.lastIndexOf('/'), vs.lastIndexOf(' '), vs.lastIndexOf('.'), vs.lastIndexOf('!'), vs.lastIndexOf('?'));
            if (index !== -1 && index >= (len - 15)) {
                var first_part = vs.substr(0, index) + "<br/>";
                var second_part = me._splitString(value.substr(index,len));
                // return   vs.substr(0, index) + "<br/>" + value.substr(index,len);
                return first_part + second_part;
            }
            return value.substr(0, len - 3) + "<br/>" + value.substr(len-3,len);
        }
        return value;
    },
    _makePieChart: function(){
        var me = this;
        me.logger.log(this,"_makePieChart");
        var total_size = 0;
        
        var chart_data = me._calculateDataForChart(me._direct_children);
 
        // get total size
        Ext.Object.each(chart_data,function(key,value){
            total_size += value;
        });
        
        var series = [];
        Ext.Object.each(chart_data,function(key,value){
            var ratio = parseInt(100*value/total_size);
            var name = Ext.util.Format.ellipsis(key,28,true) + "<br/>" + ratio + "%";
            series.push({full_name:key,name:name,y:value});
        });
        
        me.logger.log(this,"Chart Data",chart_data);
        me.logger.log(this,"Chart Series",series);
        
        if ( total_size === 0 ) {
            me.actual_chart = this.down('#actual_chart_box').add({
                xtype:'container',
                html:'No points found'
            });
        } else {
            me.actual_chart = this.down('#actual_chart_box').add({
                xtype:'rallychart',
                width: me.getWidth(),
                chartConfig: {
                    chart: {
                        spacingRight: 25,
                        spacingLeft: 5,
                        width: me.getWidth(),
                        height: me.getHeight()
                    },
                    plotOptions: {
                        
                        pie: {
                            allowPointSelect: true,
                            cursor: 'pointer',
                            dataLabels: {
                                enabled: true,
                                distance: 5,
                                color: '#000000',
                                connectorColor: '#000000',
                                format: '<b>{point.name}</b>'
                            }
                        }
                    },
                    tooltip: { 
                        enabled: false
                    },
                    title: {
                        text: 'Actual Distribution',
                        align: 'center'
                    }
                },
                chartData: {
                    series: [{type:'pie',name:'State Distribution',data:series}]
                }
            });
        }
    }
});
