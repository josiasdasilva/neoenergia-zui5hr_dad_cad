sap.ui.define([
	"sap/ui/base/ManagedObject",
	"sap/m/MessageBox",
	// "./utilities",
	"sap/ui/core/routing/History",
	"sap/ui/model/Filter",
	"sap/ui/model/json/JSONModel",
	// "com/neo/ZODHR_SS_TIME_C/webServices/connections"
	// ], function (ManagedObject, MessageBox, Utilities, History, connections) {
], function(ManagedObject, MessageBox, History, Filter, JSONModel) {

	return ManagedObject.extend("autoServico.view.Anexo", {
		getJustificationData: function() {},

		onInit: function(numTela) {
			this.tipos = [];
			this.statusCampos = true;
			this.changedData = [];
			this._data = {
				anexos: []
			};
			this.fieldsDMS = [];
			this._oDialog = this.getControl();
			this.getAttachment();
			this.getFieldsDMS(numTela);

		},
		onExit: function() {
			this._oDialog.destroy();
		},

		constructor: function(oView) {
			this._oView = oView;
			this._oControl = sap.ui.xmlfragment(oView.getId(), "autoServico.view.Anexo", this);
			this._bInit = false;
		},

		exit: function() {
			delete this._oView;
		},

		getView: function() {
			return this._oView;
		},

		getControl: function() {
			return this._oControl;
		},

		getOwnerComponent: function() {
			return this._oView.getController().getOwnerComponent();
		},

		open: function(changedData, numTela) {
			// Remove duplicates
			// changedData = changedData.filter((v, i, a) => a.indexOf(v) === i);
			changedData = changedData.filter(function(elem, index, self) {
				return index === self.indexOf(elem);
			});

			this.getJustificationData();
			var oView = this._oView;
			var oControl = this._oControl;

			if (!this._bInit) {

				// Initialize our fragment
				this.onInit(numTela);

				this._bInit = true;

				// connect fragment to the root view of this component (models, lifecycle)
				oView.addDependent(oControl);
			}

			var args = Array.prototype.slice.call(arguments);
			if (oControl.open) {
				oControl.open.apply(oControl, args);
			} else if (oControl.openBy) {
				oControl.openBy.apply(oControl, args);
			}

			if (this.getView().byId("btnSave").getVisible() === false) {
				// this.getView().byId("addAtt").setVisible(false);
			}

			if (numTela == "104") {
				if (this.getView().byId("btnAccept").getVisible() === true) {
					this.getView().byId("eToolbar").setVisible(true);
				} else {
					this.getView().byId("eToolbar").setVisible(false);
				}
			}

			if (this.fieldsDMS.length > 0) {
				this.montaTelaAnexo(changedData, numTela);
			}

		},

		close: function() {
			this._oControl.close();
		},

		setRouter: function(oRouter) {
			this.oRouter = oRouter;

		},
		getBindingParameters: function() {
			return {};

		},
		verifyFields: function() {
			if (this.selectedJustification) {
				return true;
			} else {
				return false;
			}
		},
		_onSelectJustification: function(oEvent) {
			this.selectedJustification = oEvent.getSource().getSelectedKey();
			this.selectedJustificationText = oEvent.getSource().getValue();
		},
		_onButtonPress: function() {
			var formFilled = this.verifyFields();
			var begda = this.getView().byId("begda");
			var endda = this.getView().byId("endda");
			var beghour = this.getView().byId("beghour");
			var endhour = this.getView().byId("endhour");
			var horas = this.getView().byId("horas");

			if (formFilled) {
				var oData = {
					justification: this.selectedJustification,
					justificationText: this.selectedJustificationText,
					dataInicio: begda.getValue(),
					dataFim: endda.getValue(),
					horaInicio: beghour.getValue(),
					horaFim: endhour.getValue(),
					horas: horas.getValue()

				};
				var oEventBus = sap.ui.getCore().getEventBus();
				oEventBus.publish("JustificationDialogColaborador", "Justification", oData);
				this.close();
			} else {
				sap.m.MessageToast.show("Selecione a justificativa", {
					duration: 3000
				});
			}
		},
		_onButtonPress1: function() {
			var dependents = this._oView.getDependents();

			for (var i = 0; i < dependents.length; i++) {
				if (dependents[i].getProperty("title") === "Justificar") {
					dependents[i].getContent()[0].setValue("");
				}
			}

			this.selectedJustification = "";
			this.selectedJustificationTxt = "";
			this.close();

		},

		onChangeAnexo: function(oEvent) {
			// var csrfToken = this.getView().getModel().getSecurityToken();
			var oUpload = oEvent.getSource();
			// Header Token
			// var oCustomerHeaderToken = new UploadCollectionParameter({
			// 	name: "x-csrf-token",
			//     value: "fetch"
			// });

			// oUpload.addHeaderParameter(oCustomerHeaderToken);

		},
		onSaveAnexo: function(status) {
			this.getToken(status);

		},
		onBeforeUpload: function(oEvent) {

		},
		handleUploadComplete: function(oEvent) {
			this.getAttachment();
		},
		onAdd: function() {
			var oEntry = {
				New: true,
				Old: false,
				AddManual: true,
				DMS_FIELDS: this.tipos
			};
			var oAttachments = this.getView().getModel("Attachments");
			oAttachments.getData().table.push(oEntry);
			oAttachments.refresh();
			this.getView().byId("btnSave").setEnabled(true);
		},
		onDialogWithSizePress: function() {

			if (!this._oDialog) {
				this._oDialog = sap.ui.xmlfragment("autoServico.view.Anexo", this);
				this.getView().addDependent(this._oDialog);
			}
			this._oDialog.open();
		},
		setDocumentStatus: function(reqNumber,status){
      var that = this;
			var oDialog = that.getView().byId("BusyDialog");

			try {
				oDialog.open();

				var that = this;

				/**
				 * **************To Fetch CSRF Token******************
				 */
				// var a = "/Yourservice URL or Metadata URL ";
				var a = "/sap/opu/odata/sap/ZODHR_SS_MAINTENANCE_CADASTRAL_SRV";
				var f = {
					headers: {
						"X-Requested-With": "XMLHttpRequest",
						"Content-Type": "application/atom+xml",
						//"Content-Type" : "application/xml",
						DataServiceVersion: "2.0",
						"X-CSRF-Token": "Fetch",
					},
					requestUri: a,
					method: "GET"
				};
				var oHeaders;
				var oModel = new sap.ui.model.odata.ODataModel(a, true);
				var dados = "";
				sap.ui.getCore().setModel(oModel);
				OData.request(f, function(data, oSuccess) {

					var oToken = oSuccess.headers['x-csrf-token'];
					/**
					 * ValidaÁao para o caso do navegador ser o Firefox/IE *
					 */
					if (oToken == null) {
						oToken = oSuccess.headers['X-CSRF-Token'];
					}
					// that.getView().byId('tAnexos').getRows()[0].getCells()[1];

					var anexos = that.getView().getModel("Attachments").getData().table;
					if (anexos.length == 0) {
						oDialog.close();
						return;
					}

          var req = reqNumber; //that.getView().getModel("ET_PERS_DATA").getData().REQUISITION_ID;
          var calledOnce = false;
					for (var i = 0; i < anexos.length; i++) {
						if (anexos[i].New === true) {
							var table = that.getView().byId('tAnexos').getRows();
							var uploadCollection = table[i].getCells()[1].getItems()[0];
							var key = table[i].getCells()[0].getSelectedItem().getKey();
							dados = "";
							// Nome do arquivo;tipo do arquivo;numero requisição;operação;tipo (característica);status requisição;pernr;
							// dados += uploadCollection.getValue() + ";DOA" + ";1234;" + req + ";INSERT" ;
							dados += uploadCollection.getValue() + ";DOA;" + req + ";STATUS;" + key + ";" + status + ";" + that.getView().getModel(
								"ET_HEADER").getData().PERNR;

							if (uploadCollection) {
								uploadCollection.destroyHeaderParameters();
								uploadCollection.addHeaderParameter(new sap.ui.unified.FileUploaderParameter({
									name: "slug",
									value: dados
								}));

								uploadCollection.addHeaderParameter(new sap.ui.unified.FileUploaderParameter({
									name: "x-csrf-token",
									value: oToken
								}));

								uploadCollection.setSendXHR(true);
								uploadCollection.setUploadUrl("/sap/opu/odata/sap/ZODHR_SS_MAINTENANCE_CADASTRAL_SRV/AnexoSet");
								uploadCollection.upload();
							}
            }
            if(calledOnce) break;
					}
					oDialog.close();
				});
			} catch (oException) {
				jQuery.sap.log.error("Erro Conexão" + oException.message);
				oDialog.close();
			}
		},
		saveAttachment: function(reqNumber, status) {
			var that = this;
			var oDialog = that.getView().byId("BusyDialog");

			try {
				oDialog.open();

				var that = this;

				this.deleteAttachment();

				/**
				 * **************To Fetch CSRF Token******************
				 */
				// var a = "/Yourservice URL or Metadata URL ";
				var a = "/sap/opu/odata/sap/ZODHR_SS_MAINTENANCE_CADASTRAL_SRV";
				var f = {
					headers: {
						"X-Requested-With": "XMLHttpRequest",
						"Content-Type": "application/atom+xml",
						//"Content-Type" : "application/xml",
						DataServiceVersion: "2.0",
						"X-CSRF-Token": "Fetch",
					},
					requestUri: a,
					method: "GET"
				};
				var oHeaders;
				var oModel = new sap.ui.model.odata.ODataModel(a, true);
				var dados = "";
				sap.ui.getCore().setModel(oModel);
				OData.request(f, function(data, oSuccess) {

					var oToken = oSuccess.headers['x-csrf-token'];
					/**
					 * ValidaÁao para o caso do navegador ser o Firefox/IE *
					 */
					if (oToken == null) {
						oToken = oSuccess.headers['X-CSRF-Token'];
					}
					// that.getView().byId('tAnexos').getRows()[0].getCells()[1];

					var anexos = that.getView().getModel("Attachments").getData().table;
					if (anexos.length == 0) {
						oDialog.close();
						return;
					}

					var req = reqNumber; //that.getView().getModel("ET_PERS_DATA").getData().REQUISITION_ID;
					for (var i = 0; i < anexos.length; i++) {

						if (anexos[i].New === true) {
							var table = that.getView().byId('tAnexos').getRows();
							var uploadCollection = table[i].getCells()[1].getItems()[0];
							var key = table[i].getCells()[0].getSelectedItem().getKey();
							dados = "";
							// Nome do arquivo;tipo do arquivo;numero requisição;operação;tipo (característica);status requisição;pernr;
							// dados += uploadCollection.getValue() + ";DOA" + ";1234;" + req + ";INSERT" ;
							dados += uploadCollection.getValue() + ";DOA;" + req + ";INSERT;" + key + ";" + status + ";" + that.getView().getModel(
								"ET_HEADER").getData().PERNR;

							if (uploadCollection) {
								uploadCollection.destroyHeaderParameters();
								uploadCollection.addHeaderParameter(new sap.ui.unified.FileUploaderParameter({
									name: "slug",
									value: dados
								}));

								uploadCollection.addHeaderParameter(new sap.ui.unified.FileUploaderParameter({
									name: "x-csrf-token",
									value: oToken
								}));

								uploadCollection.setSendXHR(true);
								uploadCollection.setUploadUrl("/sap/opu/odata/sap/ZODHR_SS_MAINTENANCE_CADASTRAL_SRV/AnexoSet");
								uploadCollection.upload();
							}
						}
					}
					oDialog.close();
				});
			} catch (oException) {
				jQuery.sap.log.error("Erro Conexão" + oException.message);
				oDialog.close();
			}

		},
		getAttachment: function() {
			var that = this;
			var path = "/sap/opu/odata/sap/ZODHR_SS_MAINTENANCE_CADASTRAL_SRV/";
			var oModelData = new sap.ui.model.odata.ODataModel(path); //this.getView().getModel().sServiceUrl);
			var requisition = this.getView().getModel("ET_GLOBAL_DATA").IM_REQUISITION_ID;
			var oGlobalData = that.getView().getModel("ET_GLOBAL_DATA");
			// var oModel = oBindingContext.getObject();

			var oFilters = [];
			// oFilters.push(new Filter("Pernr", FilterOperator.EQ, oModel.PERNR));
			// oFilters.push(new Filter("Data", FilterOperator.EQ, oModel.DATA_INI));
			// oFilters.push(new Filter("ReqNumber", sap.ui.model.FilterOperator.EQ, "10000000000000142"));

			if (requisition == '00000000') {
				return;
			}
			var doctype = "DOA";

			oFilters.push(new Filter("ReqNumber", sap.ui.model.FilterOperator.EQ, requisition));
			oFilters.push(new Filter("DocType", sap.ui.model.FilterOperator.EQ, doctype));
			oFilters.push(new Filter("IM_BUKRS", sap.ui.model.FilterOperator.EQ, oGlobalData.IM_BUKRS));

			oModelData.read("/AnexoSet", {
				filters: oFilters,
				async: false,
				success: function(oData) {
					var oAttachments = that.getView().getModel("Attachments");
					oAttachments.setData(null);
					oAttachments.setData({
						table: []
					});
					for (var i = 0; i < oData.results.length; i++) {
						var oDataResult = oData.results[i];
						var oEntry = {};

						if (that.getView().byId("btnSave").getVisible() === false) {
							oEntry.statusCampos = false;
						}

						oEntry.documentId = oDataResult.DocumentId;
						oEntry.Filename = oDataResult.Filename;
						oEntry.Mimetype = oDataResult.Mimetype;
						oEntry.version = oDataResult.Version;
						oEntry.Fileid = oDataResult.Fileid;
						// oEntry.Url = path + "/AnexoSet(Pernr='',Data='" + "20200101" +
						// 	"',DocumentId='" + oEntry.documentId + "',Version='" + "AA',Fileid='" + oEntry.Fileid + "',DocType='" + doctype +
						// 	"')/$value";
						oEntry.Url = path + "/AnexoSet(Pernr='',Data='" + "20200101" +
							"',DocumentId='" + oEntry.documentId + "',Version='" + "AA',Fileid='" + oEntry.Fileid + "',DocType='" + doctype +
							"',IM_BUKRS='" +
							oGlobalData.IM_BUKRS + "')/$value";
						oEntry.Response = oDataResult.Response;
						oEntry.TipoAnexo = oDataResult.TipoAnexo;
						oEntry.New = false;
						oEntry.Old = true;

						// oAttachments.table.push(oEntry);

						oAttachments.getData().table.push(oEntry);
					}
					oAttachments.refresh();

				},
				error: function(e) {
					// MessageBox.error("Erro ao Ler anexos.");
				}
			});

		},
		onOpenAttachment: function(oEvent) {
			// var lPath = '';
			var att = this.getView().getModel("Attachments");
			var index = oEvent.getSource().getParent().getParent().getIndex();
			// var urlModel = this.getOwnerComponent().getModel().sServiceUrl;
			var lPath = att.getData().table[index].Url;

			if (lPath !== '') {
				sap.m.URLHelper.redirect(lPath, true);
			}

		},
		fileSizeExceed: function() {
			MessageBox.error("Tamanho máximo do arquivo excedido! Por favor, insira um arquivo até 1mb");

		},
		getFieldsDMS: function(numTela) {
			debugger;
			var that = this;
			var oModelData = new sap.ui.model.odata.ODataModel(this.getView().getModel().sServiceUrl);
			var oBindingContext = this.getView().getBindingContext();

			var oFilters = [];

			oFilters = [new sap.ui.model.Filter("REQ_TYPE", sap.ui.model.FilterOperator.EQ, numTela)];

			oModelData.read("/E_DMS_TYPESet", {
				filters: oFilters,
				async: false,
				success: function(oData) {
					that.fieldsDMS = oData.results;
					that.tipos = [];

					for (var i = 0; that.fieldsDMS.length > i; i++) {
						if (that.fieldsDMS[i].UI5_FIELD == "") {
							that.tipos.push({
								id: that.fieldsDMS[i].DMS_FIELD,
								Name: that.fieldsDMS[i].DMS_DESCR
							});
						}
					}

				},
				error: function(e) {
					MessageBox.error("Erro ao Ler anexos");
				}
			});
		},
		montaTelaAnexo: function(changedData, numTela) {
			//TGE388990
			this.changedData = this.removeDuplicates(changedData);
			//

			var fields = this.fieldsDMS;
			var fieldsChanged = [];
			var anexos = this.getView().getModel("Attachments").getData();
			var found = false;
			var obj = {
				UI5_FIELD: '',
				DMS_FIELDS: []

			};

			for (var x = 0; anexos.table.length > x; x++) {
				if (anexos.table[x].Old == true) {
					anexos.table[x].DMS_FIELDS = this.tipos;
				}
			}

			if (changedData.length == 0) {
				this.getView().getModel("Attachments").setData(anexos);
				return;
			}

			// Verifica se o campo alterado tem registro na tabela de DMS
			for (var i = 0; changedData.length > i; i++) {
				for (var j = 0; fields.length > j; j++) {
					if (changedData[i] == fields[j].UI5_FIELD) {
						found = true;

						obj.UI5_FIELD = fields[j].UI5_FIELD;
						obj.DMS_FIELDS.push({
							id: fields[j].DMS_FIELD,
							Name: fields[j].DMS_DESCR
						});
					}

				}

				if (found == true) {
					fieldsChanged.push(obj);
				}

				obj = {
					UI5_FIELD: '',
					DMS_FIELDS: []
				};
				found = false;
			}

			found = false;
			// Com base nos campos alterados monta tabela de anexos automaticamente
			if (anexos.table.length > 0) {
				for (i = 0; fieldsChanged.length > i; i++) {
					for (var k = 0; fieldsChanged[i].DMS_FIELDS.length > k; k++) {
						for (j = 0; anexos.table.length > j; j++) {
							if (fieldsChanged[i].DMS_FIELDS[k].id == anexos.table[j].TipoAnexo) {
								found = true;
							}
						}
					}

					if (found == false) {
						anexos.table.push({
							TipoAnexo: fieldsChanged[i].DMS_FIELDS[0].id,
							New: true,
							Old: false,
							DMS_FIELDS: fieldsChanged[i].DMS_FIELDS
						});
					}
					found = false;
				}

			} else {

				var obj3 = [];
				for (var i = 0; fieldsChanged.length > i; i++) {

					var obj2 = {
						DMS_FIELDS: []
					};

					for (var x = 0; fieldsChanged[i].DMS_FIELDS.length > x; x++) {

						if (obj3.indexOf(fieldsChanged[i].DMS_FIELDS[x].id) < 0) {
							found = true;

							obj2.DMS_FIELDS.push(fieldsChanged[i].DMS_FIELDS[x]);
							obj3.push(fieldsChanged[i].DMS_FIELDS[x].id);
						}
					}
					if (found === true) {

						anexos.table.push({
							TipoAnexo: fieldsChanged[i].DMS_FIELDS[0].id,
							New: true,
							Old: false,
							DMS_FIELDS: obj2.DMS_FIELDS
						});
					}

					found = false;
				}

				/*
				Estava travando a Tela
				anexos.table.push({
					TipoAnexo: fieldsChanged[0].DMS_FIELDS[0].id,
					New: true,
					Old: false,
					DMS_FIELDS: fieldsChanged[0].DMS_FIELDS
				});
				found = false;
				
				for (i = 0; anexos.table.length > i; i++) {
					for (j = 0; fieldsChanged.length > j; j++) {
						for (var x = 0; fieldsChanged[j].DMS_FIELDS.length > x; x++) {

							if (anexos.table[i].TipoAnexo == fieldsChanged[j].DMS_FIELDS[x].id) {
								found = true;
							}
						}
						if (found === false) {
							anexos.table.push({
								TipoAnexo: fieldsChanged[j].DMS_FIELDS[0].id,
								New: true,
								Old: false,
								DMS_FIELDS: fieldsChanged[j].DMS_FIELDS
							});
						}
						found = false;
					}

				}*/
			}

			var nomeAlt = false;

			if (numTela == "102") {
				for (i = 0; changedData.length > i; i++) {
					if (changedData[i] == "ipFullName") {
						nomeAlt = true;
						break;
					}
				}

				if (nomeAlt === true) {
					found = false;
					for (i = 0; anexos.table.length > i; i++) {
						if (anexos.table[i].DMS_FIELDS[0].id == "SITUACAOCADASTRAL") {
							found = true;
						}
					}
					if (found === false) {
						anexos.table.push({
							TipoAnexo: "SITUACAOCADASTRAL",
							New: true,
							Old: false,
							DMS_FIELDS: [{
								id: "SITUACAOCADASTRAL",
								Name: "Situação Cadastral"
							}]
						});
					}
				}

			}

			// Change model Attachment
			this.getView().getModel("Attachments").setData(anexos);

		},
		onDeleteAttachment: function(oEvent) {
			var id = oEvent.getSource().getParent().getIndex();

			var anexos = this.getView().getModel("Attachments").getData();
			var anexosDelete = this.getView().getModel("AttDelete");

			if (anexos.table.legnth < 1) {
				return;
			}

			if (!anexosDelete) {
				anexosDelete = new sap.ui.model.json.JSONModel({
					table: []
				});
				this.getView().setModel(anexosDelete, "AttDelete");
			}
			var deletados = anexosDelete.getData();

			if (anexos.table[id].Old == true) {
				deletados.table.push(anexos.table[id]);
			}
			this.getView().byId('tAnexos').getRows()[id].getCells()[1].getItems()[0].setValue("");
			anexos.table.splice(id, 1);

			this.getView().getModel("AttDelete").setData(deletados);
			this.getView().getModel("Attachments").setData(anexos);

		},
		onEditAttachment: function(oEvent) {
			var id = oEvent.getSource().getParent().getIndex();

			var anexos = this.getView().getModel("Attachments").getData();
			var anexosDelete = this.getView().getModel("AttDelete");

			if (anexos.table.legnth < 1) {
				return;
			}

			if (!anexosDelete) {
				anexosDelete = new sap.ui.model.json.JSONModel({
					table: []
				});
				this.getView().setModel(anexosDelete, "AttDelete");
			}
			var deletados = anexosDelete.getData();

			if (anexos.table[id].Old == true) {
				deletados.table.push(anexos.table[id]);
			}
			this.getView().byId('tAnexos').getRows()[id].getCells()[1].getItems()[0].setValue("");
			// anexos.table.splice(id, 1);
			debugger;
			anexos.table[id] = {
				New: true,
				Old: false,
				AddManual: true,
				DMS_FIELDS: this.tipos
			};
			this.getView().getModel("AttDelete").setData(deletados);
			this.getView().getModel("Attachments").setData(anexos);

		},
		onAnexoChange: function(oEvent) {
			var id = oEvent.getSource().getParent().getIndex();
			var anexos = this.getView().getModel("Attachments").getData();

			for (var i = 0; anexos.table.length > i; i++) {
				if (id == i) {
					continue;
				}

				if (anexos.table[id].TipoAnexo == anexos.table[i].TipoAnexo) {
					MessageBox.error("Tipo de anexo selecionado já existente");
					anexos.table.splice(id, 1);
					this.getView().getModel("Attachments").setData(anexos);
					return;
				}

			}

			for (i = 0; anexos.table.length > i; i++) {
				if (id == i) {
					continue;
				}
				if (anexos.table[i].AddManual == true || anexos.table[i].Old == true) {
					continue;
				}

				for (var j = 0; anexos.table[i].DMS_FIELDS.length > j; j++) {

					if (anexos.table[id].TipoAnexo == anexos.table[i].DMS_FIELDS[j].id) {
						anexos.table.splice(i, 1);
						this.getView().getModel("Attachments").setData(anexos);
						break;
					}
				}

			}

		},

		deleteAttachment: function() {

			var path;
			var oModel = new sap.ui.model.odata.ODataModel("/sap/opu/odata/SAP/ZODHR_SS_MAINTENANCE_CADASTRAL_SRV/");
			var oModelDel = this.getView().getModel("AttDelete");

			if (!oModelDel) {
				return;
			}

			var deleted = oModelDel.getData();

			for (var i = 0; deleted.table.length > i; i++) {
				path = "AnexoSet(Pernr='',Data='',DocumentId='" + deleted.table[i].documentId + "',Version='',Fileid='" + deleted.table[i].Fileid +
					"')";

				oModel.remove(path, {
					async: false,
					success: function(oData, oResponse) {},
					error: function(e) {}
				});
			}
		},

		removeDuplicates: function(arr) {
			var clean = [];
			var cleanLen = 0;
			var arrLen = arr.length;

			for (var i = 0; i < arrLen; i++) {
				var el = arr[i];
				var duplicate = false;

				for (var j = 0; j < cleanLen; j++) {
					if (el !== clean[j]) {
						continue;
					}

					duplicate = true;
					break;
				}

				if (duplicate) {
					continue;
				}

				clean[cleanLen++] = el;
			}

			return clean;
		}
	});
}, true);