/**
 * Bookmark controller
 * @namespace nodedit.bookmarks
 */
nodedit.bookmarks = {
    
    // Nodedit bookmarks file (saves to root)
    nebfile: "/.nebmarks",
    
    /**
     * Retreives list of bookmarks from node
     * @method nodedit.bookmarks.getList
     * @param {requestCallback} fn Processed after sucessful return
     */
    getList: function (fn) {
        var _this = this;
        // Open the bookmarks file stored in the root
        nodedit.fsapi.open(_this.nebfile, function (res) {
            if (res.length < 3 || !res) {
                // Return false, not long enough to constitute true bookmark return
                fn(false);
            } else {
                // Parse and return results in callback
                fn(JSON.parse(res));
            }
        });
    },
    
    /**
     * Loads and displays the bookmark select list
     * @method nodedit.bookmarks.showList
     * @param {object} e The event triggering the list display
     */
    showList: function (e) {
        // Create element
        nodedit.$el.append("<div id=\"bookmark-menu\"><ul></ul><hr><a id=\"edit-bookmarks\"><span class=\"icon-edit\"></span> Edit Bookmarks</a></div>");
        
        var _this = this,
            output,
            menu = nodedit.$el.find("#bookmark-menu"),
            trigger = nodedit.$el.find(e.target),
            trigger_pos = trigger.position();
        
        // Get list
        _this.getList(function (list) {
            if (!list) {
                nodedit.message.error("No bookmarks. Right-click directory to bookmark.");
                menu.remove();
            } else {
                menu.css({
                    // Set top and left relative to trigger
                    top: (trigger_pos.top + trigger.outerHeight() + 5)+"px", 
                    left: trigger_pos.left-10+"px" 
                })
                .on("mouseleave click", function () {
                    // Remove on mouseleave
                    menu.remove();
                });
                
                // Set root first
                output = "<li><a data-name=\""+nodedit.filemanager.root_name+"\" data-path=\"/\"><span class=\"icon-cloud\"></span> "+nodedit.filemanager.root_name+"</a></li>";
                
                // Build list
                for (var item in list) {
                    output += "<li><a data-name=\""+item+"\" data-path=\""+list[item]+"\"><span class=\"icon-star\"></span> "+item+"</a></li>";
                }
                
                // Set in menu and show
                menu.show().children("ul").html(output);
                
                // Bind click on items
                menu.find("a").click(function () {
                    if ($(this).data("path")==="/") {
                        // Clear bookmark if root
                        _this.clearCurrent();
                    } else if ($(this).attr("id")==="edit-bookmarks"){
                        _this.openDialog();
                    }else {
                        // Set current bookmark
                        _this.setCurrent($(this).data("name"), $(this).data("path"));
                    }
                });
                
            }   
        });
    },
    
    /**
     * Opens the bookmark manager dialog
     * @method nodedit.bookmarks.openDialog
     * @param {object} [add] Object containing name and path of a new bookmark
     */
    openDialog: function (add) {
        var _this = this;
        
        // Get list of current bookmarks
        _this.getList(function (list) {
            var tmpl_data = {},
                item,
                i = 0, z,
                save_data_raw = [],
                save_data_formatted = {},
                cur_node;
            
            // If adding, create new node for template
            if (add) {
                tmpl_data[i] = { name: add.name, path: add.path, create: true };
                i++;
            }
            
            // Modify list object for template
            for (item in list) {
                tmpl_data[i] = { name: item, path: list[item], create: false };
                i++;
            }
            
            // Open modal and load template
            nodedit.modal.open(500, "Bookmarks", "bookmarks.tpl", tmpl_data, function () {
                
                // Bind to delete icons
                nodedit.$el.find(nodedit.modal.el).on("click", ".icon-trash", function () {
                    $(this).parent("td").parent("tr").remove();
                });
                
                var fixHelper = function(e, tr) {
                    var $originals = tr.children();
                    var $helper = tr.clone();
                    $helper.children().each(function (index) {
                        $(this).width($originals.eq(index).width());
                    });
                    return $helper;
                };
                
                nodedit.$el.find(nodedit.modal.el).find("table tbody").sortable({ 
                    items: "tr",
                    handle: ".icon-resize-vertical",
                    start: function(e, ui){
                        ui.placeholder.height(ui.item.height());
                        ui.item.css("border","none");
                    },
                    helper: fixHelper
                }).disableSelection(); 
                
                // Handle form submission
                nodedit.$el.find(nodedit.modal.el).on("submit", "form", function (e) {
                    e.preventDefault();
                    // Serialize form data to array
                    save_data_raw = $(this).serializeArray();
                    // Format data to object
                    for (i=0, z=save_data_raw.length; i<z; i++) {
                        if(save_data_raw[i].name==="name"){
                            // Sets the key
                            cur_node = save_data_raw[i].value;
                        } else {
                            // Set the value based on key and associated array value
                            save_data_formatted[cur_node] = save_data_raw[i].value;
                        }
                    }
                    // Save data to file
                    _this.saveList(save_data_formatted);
                });
                
            });
        });
        
    },

    /**
     * Checks if bookmark already exists before sending through to openDialog
     * @method nodedit.bookmarks.addBookmark
     * @param {object} [add] Object containing name and path of a new bookmark
     */
    addBookmark: function (add) {
        var _this = this;
        _this.getList(function (list) {
            var item;
            for (item in list) {
                if (list[item]===add.path) {
                    // Bookmark already exists
                    nodedit.message.error("Already bookmarked as "+item);
                    return false;
                }
            }
            
            // Can"t bookmark root
            if (add.path==="/") {
                nodedit.message.error("You don&apos;t need to bookmark root");
                return false;
            }
            
            // No errors, open dialog
            _this.openDialog(add);  
        });
    },
    
    /**
     * Saves JSON-formatted list back to root of node
     * @method nodedit.bookmarks.saveList
     * @param {object} bookmarks The object retrutned from the serialized array of the form
     */
    saveList: function (bookmarks) {
        var _this = this;
        // Ensure file exists
        nodedit.fsapi.createFile(_this.nebfile, function () {
            // Put contents in file
            nodedit.fsapi.save(_this.nebfile, JSON.stringify(bookmarks, null, 4), function () {
                nodedit.message.success("Bookmarks successfully saved");    
            });
        });
    },
    
    /**
     * Sets the current bookmark in localStorage
     * @method nodedit.bookmarks.setCurrent
     * @param {string} name The name of the bookmark
     * @param {string} path The path (from root)
     */
    setCurrent: function (name, path) {
        nodedit.store("nodedit_bookmark", { name: name, path: path });
        // Reinitialize filemanager
        nodedit.filemanager.init();
    },
    
    /**
     * Clears out the current bookmark
     * @method nodedit.bookmarks.clearCurrent
     */
    clearCurrent: function () {
        nodedit.store("nodedit_bookmark", null);
        // Reinitialize filemanager
        nodedit.filemanager.init();
    },
    
    /**
     * Returns object containing current bookmark name and path
     * @method nodedit.bookmarks.getCurrent
     */
    getCurrent: function () {
        return JSON.parse(nodedit.store("nodedit_bookmark"));
    }
    
};