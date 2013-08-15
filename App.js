Ext.define('CustomApp', {
    extend: 'Rally.app.App',
    componentCls: 'app',
    logger: new Rally.technicalservices.logger(),
    items: [{
        xtype:'container',
        itemId:'selector_box',
        padding:5,
        layout:{type:'hbox'},
        defaults: { padding: 5 }
    },
    {
        xtype:'container',
        itemId:'pi_title'
    }],
    launch: function() {
        this._addSelectors();
    },
    _addSelectors: function() {
        this._addTypePicker();
        this._addButton();
    },
    _addTypePicker: function() {
        this.down('#selector_box').add({
            itemId: 'type_selector',
            xtype: 'rallyportfolioitemtypecombobox'
        });
    },
    _addButton: function() {
        var me = this;
        this.down('#selector_box').add({
            xtype:'rallybutton',
            text:'Choose Portfolio Item',
            handler: me._launchPIPicker,
            scope: me
        });
    },
    _launchPIPicker: function() {
        var me = this;
        this.logger.log(this, "launch PI Picker");
        this.down('#pi_title').html = '';
        
        this.dialog = Ext.create('Rally.ui.dialog.ChooserDialog', {
            artifactTypes: [me.down('#type_selector').getRecord().get('TypePath')],
            filterableFields: [
                {displayName: 'ID', attributeName:"FormattedID"},
                {displayName: 'Name', attributeName:"Name"}
            ],
            columns: [
                {text:'id',dataIndex:'FormattedID'},
                {text:'Name',dataIndex:'Name',flex: 1},
                {text:'Type',dataIndex:'PortfolioItemType'}
            ],
            autoShow: true,
            height: 400,
            title: 'Choose a PI',
            multiple: false,
            buttons: [{
                xtype:'rallybutton',
                text:'Select',
                userAction:'clicked done in dialog',
                handler:function(){
                    me._usePI(me.dialog._getSelectedRecords());
                    
                    me.dialog.close();
                },
                scope: me
            },
            {
                xtype:'rallybutton',
                text:'Cancel',
                userAction:'clicked done in dialog',
                handler:function(){
                    me.dialog.close();
                },
                scope: me
            }]
         });
    },
    _usePI: function(records){
        var me = this;
        me.logger.log(this,records);
        if ( records.length === 0 ) {
            this.down('#pi_title').update('No Portfolio Item chosen');
        } else {
            var record = records[0];
            this.down('#pi_title').update('Portfolio Item: ' + record.get('FormattedID') + ":" + record.get('Name'));
        }
    }
});
