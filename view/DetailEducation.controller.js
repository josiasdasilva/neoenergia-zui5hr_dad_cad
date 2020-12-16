sap.ui.define([
	"sap/ui/core/mvc/Controller",
	"sap/ui/model/resource/ResourceModel",
	"sap/m/MessageBox",
	"autoServico/view/BaseController",
	"autoServico/formatter/Formatter",
	"autoServico/view/Anexo",
	"sap/ui/model/json/JSONModel",
], function (Controller, ResourceModel, MessageBox, BaseController, Formatter, Anexo, JSONModel) {
	"use strict";

	return BaseController.extend("autoServico.view.DetailEducation", {

		onInit: function () {
			this.changedData = [];
			this.oInitialLoadFinishedDeferred = jQuery.Deferred();

			if (sap.ui.Device.system.phone) {
				//Do not wait for the master2 when in mobile phone resolution
				this.oInitialLoadFinishedDeferred.resolve();
			} else {
				var oEventBus = this.getEventBus();
			}

			var oAtt = new JSONModel({table:[]});
			this.getView().setModel(oAtt, "Attachments");
			this.getRouter().attachRouteMatched(this.onRouteMatched, this);
			this.fSearchHelps();
			this.fSetHeader();
			this.fSetGlobalInformation();
			//this.fGetBlock();
			//this.fGetLog();
			//this.fValidaCompany();
			//this.getAttachment();
			var that = this;
			this.getView().addEventDelegate({onBeforeShow: function(oEvent){that.initializeState(that)}}, this.getView());
		},
		initializeState: function (ref) {
			var sDialogName = 'Anexo';
			if(ref.mDialogs[sDialogName] && ref.mDialogs[sDialogName] !== {}){
				ref.mDialogs[sDialogName].destroy();
			}
			ref.mDialogs[sDialogName] = {};
			ref.fGetBlock();
			ref.fGetLog();
			ref.fValidaCompany();
			ref.getAttachment();
			ref.fClearValueStates();
		},
		//	--------------------------------------------
		//	fGetBlock
		//	--------------------------------------------		
		fGetBlock: function () {
			var that = this;
			var oModel = new sap.ui.model.odata.ODataModel("/sap/opu/odata/SAP/ZODHR_SS_MAINTENANCE_CADASTRAL_SRV/");

			var oGlobalData = that.getView().getModel("ET_GLOBAL_DATA");

			// var urlParam = this.fGetUrl(oGlobalData.IM_PERNR, oGlobalData.IM_REQ_URL, oGlobalData.IM_LOGGED_IN);
			var urlParam = this.fGetUrlBukrs(oGlobalData.IM_PERNR, oGlobalData.IM_REQ_URL, oGlobalData.IM_LOGGED_IN, oGlobalData.IM_BUKRS);

			//SUCESSO
			function fSuccess(oEvent) {

				var is_approver = oEvent.EX_IS_APPROVER;
				var oValue = new sap.ui.model.json.JSONModel(oEvent.BLOCK);
				that.getView().setModel(oValue, "ET_FORM_EDUCATION");

				that.getView().byId("slEducDegree").setSelectedKey(oEvent.BLOCK.ESCOL);
				that.getView().byId("slFormacao").setSelectedKey(oEvent.BLOCK.AUSBI);
				that.getView().byId("slPais").setSelectedKey(oEvent.BLOCK.SLAND);

				that.getView().byId("slEstabelecimento").setValue(oEvent.BLOCK.SLART);
				that.getView().byId("slCertificado").setValue(oEvent.BLOCK.SLABS);
				that.getView().byId("slInstituicao").setValue(oEvent.BLOCK.INSTI);
				that.getView().byId("taJust").setValue(oEvent.OBSERVATION);

				// se tem id verificar os anexos
				/*				if (oEvent.BLOCK.REQUISITION_ID !== "00000000") {

									var filters = [];

									filters = [new sap.ui.model.Filter("IDREQ", sap.ui.model.FilterOperator.EQ, oEvent.BLOCK.REQUISITION_ID)];

									that.getView().setModel(oModel, "anexo");

									// Update list binding
									that.getView().byId("upldAttachments").getBinding("items").filter(filters);

								}*/

				if (oEvent.EX_MESSAGE.TYPE === "W" & oEvent.IM_ACTION !== "A") {
					if ((oEvent.BLOCK.REQUISITION_ID !== null || oEvent.BLOCK.REQUISITION_ID !== "" || oEvent.BLOCK.REQUISITION_ID !== undefined) &
						oEvent.BLOCK.REQUISITION_ID !== "00000000") {

						//retornou req do model, mas não tem na url
						if (oGlobalData.IM_REQ_URL == "") {
							MessageBox.warning(oEvent.EX_MESSAGE.MESSAGE);
						}

					}
				}
				that.fSetGlobalInformation(oEvent, that);
				that.fVerifyAction();
				that.fGetLog();
			}

			//ERRO
			function fError(oEvent) {
				var message = $(oEvent.response.body).find('message').first().text();

				if (message.substring(2, 4) == "99") {
					var detail = ($(":contains(" + "/IWBEP/CX_SD_GEN_DPC_BUSINS" + ")", oEvent.response.body));
					var formattedDetail = detail[2].outerText.replace("/IWBEP/CX_SD_GEN_DPC_BUSINS", "");
					var zMessage = formattedDetail.replace("error", "");

					that.fVerifyAllowedUser(message, that);
					MessageBox.error(zMessage);

				} else {
					MessageBox.error(message);
				}
			}

			oModel.read("ET_FORM_EDUCATION" + urlParam, null, null, false, fSuccess, fError);
		},

		//	--------------------------------------------
		//	fSearchHelps
		//	--------------------------------------------		
		fSearchHelps: function () {
			var oModel = new sap.ui.model.odata.ODataModel("/sap/opu/odata/SAP/ZODHR_SS_SEARCH_HELP_SRV_01/");

			this.fSetSearchHelpValue(oModel, "ET_SH_EDUC_FORM");
			this.fSetSearchHelpValue(oModel, "ET_SH_EDUC_ESTABEL");
			this.fSetSearchHelpValue(oModel, "ET_SH_EDUC_CURSO");
			this.fSetSearchHelpValue(oModel, "ET_SH_EDUC_CERT");
			this.fSetSearchHelpValue(oModel, "ET_SH_COUNTRY");
		},

		//	--------------------------------------------
		//	fSetSearchHelpValue
		//	--------------------------------------------		
		/*		fSetSearchHelpValue: function (oModel, modelName) {
					var that = this;

					function fSuccessExecutar(oEvent) {
						var oValue = new sap.ui.model.json.JSONModel(oEvent.results);
						that.getView().setModel(oValue, modelName);
					}

					function fErrorExecutar(oEvent) {
						console.log("An error occured while reading" + modelName + "!");
					}

					oModel.read(modelName, null, null, false, fSuccessExecutar, fErrorExecutar);
				},*/

		//--------------------------------------------
		//	fHelpRequest
		//--------------------------------------------		
		fHelpRequest: function (key, descriptionKey, cols, modelName, that, title, screenKeyField, screenTextField, onlyDesc, onlyKey) {
			var oScreenKeyField = that.getView().byId(screenKeyField);
			var oScreenTextField = that.getView().byId(screenTextField);

			that._oValueHelpDialog = new sap.ui.comp.valuehelpdialog.ValueHelpDialog({
				supportRanges: false,
				supportRangesOnly: false,
				supportMultiselect: false,
				key: key,
				descriptionKey: descriptionKey,

				ok: function (oEvent) {
					var aTokens = oEvent.getParameter("tokens");

					//Set values into others corresponding fiels in screen
					if (onlyDesc === false) {
						oScreenKeyField.setValue(aTokens[0].getProperty("key"));
						oScreenTextField.setText(aTokens[0].getProperty("text"));
					} else {
						if (onlyKey === true) {
							oScreenKeyField.setValue(aTokens[0].getProperty("key"));
						} else {
							oScreenKeyField.setValue(aTokens[0].getProperty("text"));
						}
					}

					this.close();
				},
				cancel: function () {
					this.close();
				}
			});

			//Set columns to the Search Help creation 
			var oColModel = new sap.ui.model.json.JSONModel();
			oColModel.setData({
				cols: cols
			});

			//Clear any messages it may have
			this.fMessage("None", null, screenKeyField);

			//Create the Search Help columns structure
			var oTable = this._oValueHelpDialog.getTable();
			oTable.setModel(oColModel, "columns");

			//Create contens (on test purpose) and bind it to the Search Help 
			var oModel = this.getView().getModel(modelName);
			oTable.setModel(oModel);
			oTable.bindRows("/");

			//Set title and open dialog
			that._oValueHelpDialog.setTitle(title);
			this._oValueHelpDialog.open();
		},

		// --------------------------------------------
		// fActions
		// -------------------------------------------- 		
		fActions: function (that, actionText, action, req, newDt) {
			var question;

			switch (action) {
			case "A": //Approve
				question = "Confirmar aprovação?";
				break;

			case "D": //Decline
				question = "Confirmar reprovação?";
				break;

			case "C": //Cancel
				question = "Confirmar cancelamento?";
				break;

			default:
				question = "Confirmar " + actionText + "?";
			}

			MessageBox.confirm(question, {
				title: actionText,
				initialFocus: sap.m.MessageBox.Action.CANCEL,
				onClose: function (sButton) {
					if (sButton === MessageBox.Action.OK) {
						that.fCreateRequisition(that, action, req, newDt);
						return true;
					}
				}
			});
		},

		// --------------------------------------------
		// fUnableFields
		// --------------------------------------------  		
		fUnableFields: function (closeButtons) {
			var oView = this.getView();

			oView.byId("slEducDegree").setEnabled(false);
			oView.byId("slEstabelecimento").setEnabled(false);
			oView.byId("slFormacao").setEnabled(false);
			oView.byId("slInstituicao").setEnabled(false);
			oView.byId("slPais").setEnabled(false);
			oView.byId("slCertificado").setEnabled(false);

			oView.byId("taJust").setEditable(false);

			if (closeButtons === true) {
				// oView.byId("btnSanity").setEnabled(false);
				oView.byId("btnSave").setEnabled(false);
				oView.byId("btnAccept").setEnabled(false);
				oView.byId("btnCancel").setEnabled(false);
			}
		},

		// --------------------------------------------
		// onFieldChange
		// -------------------------------------------- 		
		onFieldChange: function (oEvent) {
			var fieldName = oEvent.getParameter("id").substring(12);
			this.changedData.push(fieldName);
			//this.getView().byId("btnSanity").setVisible(false);
			this.getView().byId("btnAccept").setEnabled(true);
			this.getView().byId("btnSave").setEnabled(true);
		},

		//	--------------------------------------------
		//	onFieldLiveChange
		//	--------------------------------------------		
		onFieldLiveChange: function (oEvent) {
			var fieldName = oEvent.getParameter("id").substring(12);
			this.changedData.push(fieldName);
			var instituicao;
			if(fieldName == "slInstituicao"){
				instituicao = this.getView().byId("slInstituicao").getValue().toUpperCase();
				this.getView().byId("slInstituicao").setValue(instituicao);
			} else{
				this.fConvertToUppercase(fieldName);
			}

			// this.getView().byId("btnSanity").setVisible(false);
			this.getView().byId("btnAccept").setEnabled(true);
			this.getView().byId("btnSave").setEnabled(true);
		},

		//	--------------------------------------------
		//	fSearchHelpCertificado
		//	--------------------------------------------
		fSearchHelpCertificado: function () {
			var urlParam = "";
			var ipEstabelecimento = this.getView().byId("slEstabelecimento").getValue();
			var oModel = new sap.ui.model.odata.ODataModel("/sap/opu/odata/SAP/ZODHR_SS_SEARCH_HELP_SRV_01/");

			if (ipEstabelecimento !== "" && ipEstabelecimento !== undefined) {
				urlParam = this.fFillURLFilterParam("IM_ESTAB", ipEstabelecimento);
			}

			this.fSetSearchHelpValue(oModel, "ET_SH_EDUC_CERT", urlParam);

		},

		// --------------------------------------------
		// fCreateRequisition
		// -------------------------------------------- 
		fCreateRequisition: function (that, action, req, newDt) {
			var oCreate = {};
			var oGlobalData = that.getView().getModel("ET_GLOBAL_DATA");

			oCreate.BLOCK = {};

			oCreate.BLOCK.REQUISITION_ID = oGlobalData.IM_REQUISITION_ID;
			oCreate.IM_REQUISITION_ID = oGlobalData.IM_REQUISITION_ID;
			oCreate.IM_ACTION = action;
			oCreate.IM_LOGGED_IN = oGlobalData.IM_LOGGED_IN;
			oCreate.IM_PERNR = oGlobalData.IM_PERNR;
			oCreate.IM_BUKRS = oGlobalData.IM_BUKRS;
			oCreate.OBSERVATION = that.getView().byId("taJust").getValue();
			oCreate.BLOCK.INSTI = that.getView().byId("slInstituicao").getValue();
			oCreate.BLOCK.SLART = that.getView().byId("slEstabelecimento").getValue();
			oCreate.BLOCK.SLABS = that.getView().byId("slCertificado").getValue();

			oCreate.BLOCK.ESCOL = that.getView().byId("slEducDegree").getSelectedKey();
			oCreate.BLOCK.AUSBI = that.getView().byId("slFormacao").getSelectedKey();
			oCreate.BLOCK.SLAND = that.getView().byId("slPais").getSelectedKey();

			oCreate.BLOCK.TYPE_SAVE = req;

			if (newDt !== "" && newDt !== undefined) {
				oCreate.BLOCK.SSG_DATE = newDt;
			} else {
				oCreate.BLOCK.SSG_DATE = null;
			}

			//SUCESSO
			function fSuccess(oEvent) {
				oGlobalData.REQUISITION_ID = oEvent.EX_REQUISITION_ID;

				switch (action) {
				case "A":
					MessageBox.success("Requisição " + oEvent.EX_REQUISITION_ID + " aprovada com sucesso!");
					that.fUnableApprovalButtons(that);
					that.fVerifyAction(false, "A");
					// *** ANEXO ***
					//that.fSaveAttachmentView(oEvent.EX_REQUISITION_ID);
					break;

				case "D":
					MessageBox.success("Requisição " + oEvent.EX_REQUISITION_ID + " reprovada!");
					that.fUnableApprovalButtons(that);
					that.fVerifyAction(false, "D");
					// *** ANEXO ***
					//that.fSaveAttachmentView(oEvent.EX_REQUISITION_ID);
					break;

				case "S":
					that.fSucessMessageFromSendAction(oEvent, true);
					that.fVerifyAction(false, "S");
					that.saveAttachment(oGlobalData.REQUISITION_ID, 'S');
					that.closeDmsDocument(oGlobalData.REQUISITION_ID);
					// *** ANEXO ***
					//that.fSaveAttachmentView(oEvent.EX_REQUISITION_ID);
					break;

				case "C":
					MessageBox.success("Operação realizada com sucesso! As alterações realizadas foram canceladas");

					/*						if (oGlobalData.IM_REQ_URL !== "") {
												that.fUnableAllButtons(that);
											} else {
												that.fGetBlock();
											}*/

					that.fGetBlock();
					//var oUploadCollection = that.getView().byId("upldAttachments");
					//oUploadCollection.destroyItems();
					that.fVerifyAction(false, "C");
					// *** ANEXO ***
					//that.fSaveAttachmentView(oEvent.EX_REQUISITION_ID);
					var oAtt = new JSONModel({table:[]});
					that.getView().setModel(oAtt, "Attachments");
					break;

				case "X":
					MessageBox.success("Dados confirmados com sucesso! Obrigado por validar suas informações para o eSocial");
					// that.getView().byId("btnSanity").setVisible(false);
					oGlobalData.IM_REQUISITION_ID = "00000000";
					break;

				case "R":
					MessageBox.success(
						"Operação realizada com sucesso! Após preencher todos os dados da solicitação, clique em enviar para dar continuidade ao atendimento"
					);
					that.fSetGlobalInformation(oEvent, that);
					that.fVerifyAction();
					that.saveAttachment(oGlobalData.REQUISITION_ID, 'G');
					// *** ANEXO ***
					//that.fSaveAttachmentView(oEvent.EX_REQUISITION_ID);
					break;
				}
				that.fGetLog();				
			}

			//ERRO
			function fError(oEvent) {
				oGlobalData.IM_REQUISITION_ID = that.fGetRequisitionId(oEvent);

				if ($(":contains(" + "/IWBEP/CX_SD_GEN_DPC_BUSINS" + ")", oEvent.response.body).length == 0) {
					var message = $(oEvent.response.body).find("message").first().text();

					if (message === undefined || message === "" || message === " ") {
						message = "Erro inesperado. Favor contactar o administrador do sistema";
					}

					MessageBox.error(message);

				} else {
					var detail = $(":contains(" + "/IWBEP/CX_SD_GEN_DPC_BUSINS" + ")", oEvent.response.body);
					var formattedDetail = (detail[2].outerText.replace("/IWBEP/CX_SD_GEN_DPC_BUSINS", ""));
					formattedDetail = formattedDetail.replace("error", "");
					MessageBox.error(formattedDetail);

				}
			}

			var oModel = new sap.ui.model.odata.ODataModel("/sap/opu/odata/sap/ZODHR_SS_MAINTENANCE_CADASTRAL_SRV/");
			oModel.create("ET_FORM_EDUCATION", oCreate, null, fSuccess, fError);
		},

		// --------------------------------------------
		// onApprove
		// -------------------------------------------- 

		onApprove: function () {
			var newDt;

			this.fActions(this, "Aprovação", "A", "M", newDt);
			// this._Dialog = sap.ui.xmlfragment("autoServico.view.TypeReq", this);

			// this._Dialog.open();
		},

		onSelect: function (oEvent) {

			var selecao = oEvent.getParameter('selectedIndex');
			if (selecao === 1) {
				sap.ui.getCore().byId("DataEfetiva").setVisible(true);
			} else if (selecao === 0) {
				sap.ui.getCore().byId("DataEfetiva").setVisible(false);
			}

		},

		handleChange: function () {
			var data = sap.ui.getCore().byId("data").getValue();
			var dataCompara = new Date();
			data = data.substring(3, 5) + "." + data.substring(0, 2) + "." + data.substring(6, 10);
			var data2 = new Date(data);

			dataCompara.setHours("00", "00", "00", "00");

			if (data2 < dataCompara) {
				MessageBox.error("A data não pode ser anterior a hoje.");
				sap.ui.getCore().byId("data").setValue("");
			}
		},

		// --------------------------------------------
		// onContinue
		// -------------------------------------------- 

		onContinue: function (oEvent) {

			var evoluir = sap.ui.getCore().byId("evoluir_req").getSelected();
			// var manter = sap.ui.getCore().byId("manter").getSelected();
			var data = sap.ui.getCore().byId("data").getValue();
			var req;
			var selecionado = sap.ui.getCore().byId("rbg")._oItemNavigation.iSelectedIndex;
			var dateFormat = sap.ui.core.format.DateFormat.getTimeInstance({
				pattern: "yyyy-MM-ddT00:00:00"
			});

			if (evoluir === true && data === "") {
				MessageBox.error("Data de efetivação é obrigatória!");
				return "";
			}

			if (data !== "") {
				data = data.substring(3, 5) + "." + data.substring(0, 2) + "." + data.substring(6, 10);
				var dt = new Date(data);
				var newDt = dateFormat.format(new Date(dt));
			}

			if (selecionado === 0) {
				req = "M";
			} else if (selecionado === 1) {
				req = "E";
			}

			this._Dialog.destroy();

			this.fActions(this, "Aprovação", "A", req, newDt);
		},

		// onApprove: function() {
		// 	this.fActions(this, "Aprovação", "A");
		// },

		// --------------------------------------------
		// onSave
		// --------------------------------------------  
		onSave: function () {
			var attachment = this.fValidAttachment();

			if (attachment === false) {
				this.handleErrorMessageAttachment();
				return;
			}
			this.fActions(this, "gravação", "R");
		},

		// --------------------------------------------
		// onSend
		// --------------------------------------------  
		onSend: function () {

			var that = this;
			var oBundle = this.getView().getModel("i18n").getResourceBundle();
			var message = oBundle.getText("termo_responsabilidade");
			var attachment = this.fValidAttachment();
			
			if(!attachment){
				this.handleErrorMessageAttachment();
				return;
			}
			
			MessageBox.confirm(
				message, {
					title: "Termo de responsabilidade",
					initialFocus: sap.m.MessageBox.Action.CANCEL,
					onClose: function (sButton) {
						if (sButton === MessageBox.Action.OK) {
							that.fActions(that, "envio", "S");
						}
					}
				});
		},

		// --------------------------------------------
		// onSanitation
		// --------------------------------------------  
		onSanitation: function () {
			var that = this;
			var oBundle = this.getView().getModel("i18n").getResourceBundle();
			var message = oBundle.getText("termo_responsabilidade");

			MessageBox.confirm(
				message, {
					title: "Termo de responsabilidade",
					initialFocus: sap.m.MessageBox.Action.CANCEL,
					onClose: function (sButton) {
						if (sButton === MessageBox.Action.OK) {
							that.fActions(that, "saneamento", "X");
						}
					}
				});
		},

		// --------------------------------------------
		// onPress
		// -------------------------------------------- 
		onPress: function () {
			this._Dialog = sap.ui.xmlfragment("autoServico.helpTextFiles.QuickViewHelpEducation", this);
			this._Dialog.open();
		},

		// --------------------------------------------
		// onClose
		// -------------------------------------------- 
		onClose: function () {
			this._Dialog.close();
		},

		// --------------------------------------------
		// onCancel
		// -------------------------------------------- 		
		onCancel: function () {
			this.getView().byId("txtEstabelecimento").setText();
			this.getView().byId("txtCertificado").setText();
			
			this.fActions(this, "Cancelamento", "C");
		},

		// --------------------------------------------
		// onReject
		// --------------------------------------------  
		onReject: function () {
			this.fActions(this, "Rejeição", "D");
		},
		
		fValidaCompany: function () {
			var that = this; 
			var oModel = new sap.ui.model.odata.ODataModel("/sap/opu/odata/SAP/ZODHR_SS_MAINTENANCE_CADASTRAL_SRV/");
			var company;
			oModel.read("/et_companySet", {
				async: false,
				success: function (oData, oResponse) {
					company = oData.results[0].company;
					if(company === 'ELEK'){
					} else{
						that.getView().byId("lblEstabelecimento").setVisible(true);
						that.getView().byId("slEstabelecimento").setVisible(true);
						that.getView().byId("slFormacao").setVisible(true);
						that.getView().byId("slInstituicao").setVisible(true);
						that.getView().byId("slPais").setVisible(true);
						that.getView().byId("slCertificado").setVisible(true);
						that.getView().byId("lblCertificado").setVisible(true);
					}
				},
				error: function (e) {
				}
			});
		},
		showDialogAnexo: function (){

			var sDialogName = 'Anexo';
			this.mDialogs = this.mDialogs || {};
			var oDialog = this.mDialogs[sDialogName];

			if (!oDialog) {
	    		oDialog = new Anexo(this.getView()); //Justificar ausencia
	
				this.mDialogs[sDialogName] = oDialog;
	
				// For navigation.
				oDialog.setRouter(this.oRouter);
			}
			
			oDialog.open(this.changedData,"106");
			//this.changedData = [];
		},
		
		saveAttachment: function(reqNumber, status){
			var sDialogName = 'Anexo';
			this.mDialogs = this.mDialogs || {};
			var oDialog = this.mDialogs[sDialogName];
			
			if (oDialog) {
				oDialog.saveAttachment(reqNumber, status);
			}
		},
		closeDmsDocument: function (reqNumber) {
			var sDialogName = 'Anexo';
			this.mDialogs = this.mDialogs || {};
			var oDialog = this.mDialogs[sDialogName];

			if (oDialog) {
				oDialog.setDocumentStatus(reqNumber, 'S');
			}
		},
		getAttachment:function(){
			
			var sDialogName = 'Anexo';
			this.mDialogs = this.mDialogs || {};
			var oDialog = this.mDialogs[sDialogName];

			if (!oDialog) {
	    		oDialog = new Anexo(this.getView()); //Justificar ausencia
	
				this.mDialogs[sDialogName] = oDialog;
	
				// For navigation.
				oDialog.setRouter(this.oRouter);
			}
			
			oDialog.getAttachment();
		}
	});
});