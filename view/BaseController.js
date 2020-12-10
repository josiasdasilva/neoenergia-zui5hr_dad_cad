sap.ui.define([
	"sap/ui/core/mvc/Controller",
	"sap/ui/core/routing/History",
	"sap/m/MessageBox",
	'sap/ui/model/Filter'
], function (Controller, History, MessageBox, Filter) {
	"use strict";

	return Controller.extend("autoServico.view.BaseController", {

		oClonedObject: {},
		modelHasChanged: false,

		// onBeforeRendering: function() {
		// 	console.log("Before RENDERING *** BASE CONTROLLER");
		// },

		//	--------------------------------------------
		//	fCheckSaneaBtn
		//	--------------------------------------------			
		// fCheckSaneaBtn: function (view) {

		// 	var aData = sap.ui.getCore().getModel("ET_VALID_BLOCK").getData();

		// 	if (aData !== undefined) {
		// 		for (var i = 0; i < aData.results.length; i++) {
		// 			if (aData.results[i].BLOCK_TYPE === view) {

		// 				if (aData.results[i].SANEA_FLAG === "X") {
		// 					console.log("SANEA FLAG");
		// 				} else {
		// 					var oView = this.getView();
		// 					oView.byId("btnSanity").setVisible(false);
		// 				}

		// 				break;
		// 			}
		// 		}
		// 	}

		// 	// return stringToReplace;
		// },

		//	--------------------------------------------
		//	fRemoveSpecialChars
		//	--------------------------------------------			
		fRemoveSpecialChars: function (fileName) {
			var stringToReplace;
			var specialChars = "!@#$^&%*()+=-[]\/{}|:<>?,.";
			for (var i = 0; i < specialChars.length; i++) {
				stringToReplace = stringToReplace.replace(new RegExp("\\" + specialChars[i], 'gi'), '');
			}
			return stringToReplace;
		},

		//	--------------------------------------------
		//	fFormatDateToUser
		//	--------------------------------------------		
		fFormatDateToUser: function (gatewayFormatDate, separator) {

			if (gatewayFormatDate !== null) {
				var day = gatewayFormatDate.substring(8, 10);
				var month = gatewayFormatDate.substring(5, 7);
				var year = gatewayFormatDate.substring(0, 4);

				return day + separator + month + separator + year;
			}

		},

		//	--------------------------------------------
		//	fGetTodayDate
		//	--------------------------------------------		
		fGetTodayDate: function () {
			var today = new Date();
			var day = today.getUTCDate();
			var month = today.getUTCMonth() + 1; //January is 0
			var year = today.getUTCFullYear();

			if (day < 10) {
				day = "0" + day;
			}

			if (month < 10) {
				month = "0" + month;
			}

			//Return in gateway format (ex: 2017-05-31T00:00:00)
			return year + "-" + month + "-" + day + "T00:00:00";
		},

		//	--------------------------------------------
		//	fGetFirstDayOfMonth
		//	--------------------------------------------		
		fGetFirstDayOfMonth: function () {
			var today = new Date();
			var month = today.getUTCMonth() + 1; //January is 0
			var year = today.getUTCFullYear();

			if (month < 10) {
				month = "0" + month;
			}

			//Return in gateway format (ex: 2017-05-31T00:00:00)
			return year + "-" + month + "-" + "01" + "T00:00:00";
		},

		//	--------------------------------------------
		//	fRemoveSpecialCharsAttach
		//	--------------------------------------------			
		fRemoveSpecialCharsAttach: function (fileName) {
			var specialChars = "!@#$^&%*()+=-[]\/{}|:<>?,";
			for (var i = 0; i < specialChars.length; i++) {
				fileName = fileName.replace(new RegExp("\\" + specialChars[i], 'gi'), '');
			}
			return fileName;
		},

		//	--------------------------------------------
		//	fVerifyAllowedUser
		//	--------------------------------------------			
		fVerifyAllowedUser: function (message, that) {
			//Usuário sem permissão de acesso
			if (message.substring(0, 1) === "S" && message.substring(5) === "994") {
				that.fUnableAllButtons();
				that.fUnableFields();
			}
		},

		// --------------------------------------------
		// fControlAttributesFields
		// -------------------------------------------- 		
		fControlAttributesFields: function (fieldPlan, fieldOption) {
			var oView = this.getView();
			var plan = oView.byId(fieldPlan).getValue().trim();

			if (plan !== "") {
				oView.byId(fieldOption).setEnabled(true);
			} else {
				oView.byId(fieldOption).setEnabled(false);
			}
		},

		//	--------------------------------------------
		//	fGetDescription
		//	--------------------------------------------		
		fGetDescription: function (modelName, textFieldName, value, modelFieldValue, modelFieldDesc, that) {
			var oModel = that.getView().getModel(modelName);
			var description = "";

			if (oModel !== undefined) {
				var aData = oModel.getData();

				if (aData !== undefined) {
					for (var i = 0; i < aData.length; i++) {
						if (aData[i][modelFieldValue] === value) {
							description = aData[i][modelFieldDesc];
							break;
						}
					}
				}
			}

			that.getView().byId(textFieldName).setText(description);
		},

		// --------------------------------------------
		// fActions
		// -------------------------------------------- 		
		fActions: function (that, actionText, action) {
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
						that.fCreateRequisition(that, action);
						return true;
					}
				}
			});
		},

		//	--------------------------------------------
		//	fSucessMessageFromSendAction
		//	--------------------------------------------
		fSucessMessageFromSendAction: function (oEvent, educForm) {
			var oGlobalInformation = this.getView().getModel("ET_GLOBAL_DATA");
			var message;

			if (oEvent.EX_MESSAGE !== undefined) {
				if (oEvent.EX_MESSAGE.ID === "99" && oEvent.EX_MESSAGE.NUMBER === "992" &&
					oEvent.EX_MESSAGE.TYPE === "S") {

					message = oEvent.EX_MESSAGE.MESSAGE;

					if (educForm !== undefined) {
						message = message + "\n\n" +
							"Atualize suas informações também no Portal Pessoas > Carreira e Sucessão > Histórico e Aspirações e entregue o comprovante na área de Pessoas.";
					}

					oGlobalInformation.NO_WORKFLOW = "X";

				} else {
					message =
						"Operação realizada com sucesso!";

					oGlobalInformation.NO_WORKFLOW = "";
				}
			}

			MessageBox.success(message);
		},

		//	--------------------------------------------
		//	fConvertToUppercase
		//	--------------------------------------------		
		fConvertToUppercase: function (fieldName) {
			var fieldValue = this.getView().byId(fieldName).getValue();

			var field = this.getView().byId(fieldName);
			var focusInfo = field.getFocusInfo();

			this.fMessage("None", null, fieldName);

			if (this.fVerifyCharacter(fieldValue) === true) {
				this.getView().byId(fieldName).setValue(fieldValue.toUpperCase());
			} else {
				if (fieldValue.trim() !== "") {
					this.fMessage("Error", "entrada_invalida", fieldName);
				}
			}

			field.applyFocusInfo(focusInfo);
		},

		//	--------------------------------------------
		//	fVerifyCharacter
		//	--------------------------------------------
		fVerifyCharacter: function (input) {
			var letters = /^[0-9a-zA-Z\s]+$/;
			if (letters.test(input)) {
				return true;
			} else {
				return false;
			}
		},

		//	--------------------------------------------
		//	fSSGJust
		//	--------------------------------------------
		fSSGJust: function () {
			this.getView().byId("formJustificationSSG").setVisible(true);
			this.getView().byId("taJustSSG").setEditable(true);
		},

		//	--------------------------------------------
		//	fVerifyAction
		//	--------------------------------------------			
		fVerifyAction: function (getOnlyAction, userAction) {
			var closedReq = {};
			var oGlobalInformation = this.getView().getModel("ET_GLOBAL_DATA");
			var oHeader = this.getView().getModel("ET_HEADER");
			var action = "",
				req,
				req_url,
				profile,
				pernr;

			closedReq.CLOSED = "";

			var oView = this.getView();

			if (oGlobalInformation) {
				if (oGlobalInformation.EX_IS_APPROVER == "X") {
					action = "A";
				}

				if (oGlobalInformation.IM_REQUISITION_ID !== "00000000") {

					if (oGlobalInformation.IM_REQUISITION_ID === undefined) {
						req = "00000000";
					} else {
						req = oGlobalInformation.IM_REQUISITION_ID;
						oView.byId("lblStatus").setVisible(true);
					}

				} else if (oGlobalInformation.REQUISITION_ID !== "00000000") {

					if (oGlobalInformation.REQUISITION_ID === undefined) {
						req = "00000000";
					} else {
						req = oGlobalInformation.REQUISITION_ID;
					}
				}

				req_url = oGlobalInformation.IM_REQ_URL;
				profile = oGlobalInformation.IM_LOGGED_IN;
				pernr = oGlobalInformation.IM_PERNR;

				// req = parseFloat(req);
			}

			oView.byId("lblNumReq").setText("Núm. Requisição: " + req);

			if (getOnlyAction !== true) {

				// é o aprovador
				if (action === "A" && req != "00000000") {

					if (userAction === "A" || userAction === "D" || userAction === "C") {
						this.fUnableFields();
					}

					this.getView().byId("taJust").setEnabled(false);

					if (userAction === undefined) {
						oView.byId("btnApprove").setVisible(true);
						oView.byId("btnCancel").setVisible(true);
						// oView.byId("btnReject").setVisible(true);
						// oView.byId("btnSanity").setVisible(false);
						oView.byId("btnSave").setVisible(false);
						oView.byId("btnAccept").setVisible(false);
						oView.byId("btnCancel").setEnabled(true);
					} else {
						this.fUnableAllButtons();
					}

					this.fMessageWhenWorkflow(oGlobalInformation.NO_WORKFLOW, userAction);
				}

				// colaborador entrando pelo painel // PERNR_LOGGED_IN
				else if (req != '00000000' & req != undefined & req_url != '00000000' & req_url != undefined & req_url != "" & oHeader.oData[
						"PERNR_LOGGED_IN"] == pernr) {

					if (userAction == 'S') {
						this.fUnableFields();
						this.fUnableAllButtons();
					}

					//req enviada para aprovação ( aberto )
					else if (oGlobalInformation.MSG == "998") {
						closedReq.CLOSED = "X";

						this.fUnableFields();
						this.fUnableAllButtons();

						if (oGlobalInformation.NO_WORKFLOW === "") {
							oView.byId("lblStatus").setText("Status: Para Aprovação");
						} else {
							oView.byId("lblStatus").setText("Status: Finalizado");
						}

					} else if (oGlobalInformation.MSG == "997") {
						// oView.byId("btnSanity").setVisible(false);
						oView.byId("btnSave").setVisible(true);
						oView.byId("btnAccept").setVisible(true);
						oView.byId("btnAccept").setEnabled(true);
						oView.byId("btnApprove").setVisible(false);
						// oView.byId("btnReject").setVisible(false);
						oView.byId("btnCancel").setVisible(true);
						oView.byId("btnCancel").setEnabled(true);
						oView.byId("lblStatus").setVisible(true);
						oView.byId("lblStatus").setText("Status: Requisição Salva");

						try {
							oView.byId("formSSGDate").setVisible(false);
						} catch (err) {}

					} else if (oGlobalInformation.MSG == "990") {
						this.fUnableAllButtons();
						this.fUnableFields();
						oView.byId("lblStatus").setText("Status: Requisição Saneada");
						closedReq.CLOSED = "X";

					} else if (oGlobalInformation.MSG == "989") {
						this.fUnableAllButtons();
						this.fUnableFields();
						oView.byId("lblStatus").setText("Status: Requisição Finalizada");
						closedReq.CLOSED = "X";

					} else if (oGlobalInformation.MSG == "988") {
						this.fUnableAllButtons();
						this.fUnableFields();
						oView.byId("lblStatus").setText("Status: Requisição Cancelada");
						closedReq.CLOSED = "X";

					} else {
						this.fUnableFields();
						this.fUnableAllButtons();
						closedReq.CLOSED = "X";
					}
				}

				// somente visualização da requisição 
				else if (req != '00000000' & req != undefined & req_url != '00000000' & req_url != undefined & req_url != "" & oHeader.oData[
						"PERNR_LOGGED_IN"] != pernr) {
					this.fUnableFields();
					this.fUnableAllButtons();
					closedReq.CLOSED = "X";
					oView.byId("lblStatus").setVisible(true);

					switch (oGlobalInformation.MSG) {
					case "988":
						oView.byId("lblStatus").setText("Status: Requisição Cancelada");
						break;

					case "989":
						oView.byId("lblStatus").setText("Status: Requisição Finalizada");
						break;

					case "990":
						oView.byId("lblStatus").setText("Status: Requisição Saneada");
						break;

					case "997":
						oView.byId("lblStatus").setText("Status: Requisição Salva");
						break;

					case "998":
						if (oGlobalInformation.NO_WORKFLOW === "") {
							oView.byId("lblStatus").setText("Status: Para Aprovação");
						} else {
							oView.byId("lblStatus").setText("Status: Finalizado");
						}
						break;
					}
				}

				// colaborador e requisição enviada
				else if (profile === 0 & req != '00000000' & req != undefined & req_url == "" & (oGlobalInformation.MSG == "998" || userAction ==
						"S")) {

					this.fUnableFields();
					this.fUnableAllButtons();
					closedReq.CLOSED = "X";
					oGlobalInformation.MSG = "998";
					oView.byId("lblStatus").setVisible(true);

					if (oGlobalInformation.NO_WORKFLOW === "") {
						oView.byId("lblStatus").setText("Status: Para Aprovação");
					} else {
						oView.byId("lblStatus").setText("Status: Finalizado");
					}

				} else if (profile === 0 & req !== '00000000' & req !== undefined & req_url === "") {
					// oView.byId("btnSanity").setVisible(false);
					oView.byId("btnSave").setVisible(true);
					oView.byId("btnAccept").setVisible(true);
					oView.byId("btnAccept").setEnabled(true);
					oView.byId("btnApprove").setVisible(false);
					// oView.byId("btnReject").setVisible(false);
					oView.byId("btnCancel").setVisible(true);
					oView.byId("lblStatus").setText("Status: Requisição Salva");
					oGlobalInformation.MSG = "997";

					try {
						oView.byId("formSSGDate").setVisible(false);
					} catch (err) {}

				}

				// colaborador e sem requisição
				else if (profile === 0) {
					// oView.byId("btnSanity").setVisible(true);
					oView.byId("btnSave").setVisible(true);

					//CR - 09.05 - Ini
					//oView.byId("btnSave").setEnabled(true);
					oView.byId("btnSave").setEnabled(false);
					//CR - 09.05 - Fim

					oView.byId("btnAccept").setVisible(true);
					oView.byId("btnAccept").setEnabled(false);
					oView.byId("btnApprove").setVisible(false);
					// oView.byId("btnReject").setVisible(false);
					oView.byId("btnCancel").setVisible(false);

					oView.byId("lblStatus").setText("");
					oView.byId("lblStatus").setVisible(false);
					oGlobalInformation.MSG = "";

					try {
						oView.byId("formSSGDate").setVisible(false);
						oView.byId("formJustificationSSG").setVisible(false);

					} catch (err) {}

				}
				// RH visualizando bloco do Colaborador
				else if (profile !== 0 && (oView.sViewName === 'autoServico.view.DetailPersonalData' ||
						oView.sViewName === 'autoServico.view.DetailDocuments' ||
						oView.sViewName === 'autoServico.view.DetailAddress' ||
						oView.sViewName === 'autoServico.view.DetailEducation' ||
						oView.sViewName === 'autoServico.view.DetailBankData' ||
						oView.sViewName === 'autoServico.view.DetailDependents' ||
						oView.sViewName === 'autoServico.view.DetailHealth')) {

					this.fUnableFields();
					this.fUnableAllButtons();
					closedReq.CLOSED = "X";

				}

				// Blocos do RH e sem requisição
				else if (profile !== 0 && req === "00000000") {
					// oView.byId("btnSanity").setVisible(false);
					oView.byId("btnApprove").setVisible(false);
					// oView.byId("btnReject").setVisible(false);
					oView.byId("btnAccept").setEnabled(false);
					oView.byId("btnCancel").setVisible(false);
					oView.byId("lblStatus").setText("");
				}

				// Blocos do RH e com requisição salva
				else if (profile !== 0 && req !== '00000000' && req !== undefined && req_url === "" && ((oGlobalInformation.MSG === "997" ||
						userAction === "R") && userAction !== "S" && userAction !== "C")) {
					oView.byId("btnSanity").setVisible(false);
					oView.byId("btnApprove").setVisible(false);
					// oView.byId("btnReject").setVisible(false);
					oView.byId("btnSave").setVisible(true);
					oView.byId("btnAccept").setVisible(true);
					oView.byId("btnAccept").setEnabled(true);
					oView.byId("btnCancel").setVisible(true);
					oView.byId("btnCancel").setEnabled(true);

					oView.byId("lblStatus").setText("Status: Requisição Salva");

					// Blocos do RH e com requisição enviada	
				} else if (profile !== 0 && req != '00000000' && req != undefined && req_url == "" && (oGlobalInformation.MSG == "998" ||
						userAction === "S")) {

					this.fMessageWhenWorkflow(oGlobalInformation.NO_WORKFLOW, userAction);
					this.fUnableFields();
					this.fUnableAllButtons();
					closedReq.CLOSED = "X";
				}
			}

			var closedReqModel = new sap.ui.model.json.JSONModel(closedReq);
			this.getView().setModel(closedReqModel, "ET_CLOSED_REQUISITION");

			// oView.byId("btnSanity").setVisible(false);

			return action;
		},

		//	--------------------------------------------
		//	fMessageWhenWorkflow
		//	--------------------------------------------		
		fMessageWhenWorkflow: function (noWorkflow, userAction) {
			var oView = this.getView();

			if (noWorkflow === "") {
				switch (userAction) {
				case "A":
					oView.byId("lblStatus").setText("Status: Aprovado");
					break;

				case "D":
					oView.byId("lblStatus").setText("Status: Reprovado");
					break;

				case "C":
					oView.byId("lblStatus").setText("Status: Cancelado");
					break;

				default:
					oView.byId("lblStatus").setText("Status: Para Aprovação");
					break;
				}
			} else {
				oView.byId("lblStatus").setText("Status: Finalizado");
			}
		},

		//	--------------------------------------------
		//	fSetSearchHelpValue
		//	--------------------------------------------		
		fSetSearchHelpValue: function (oModel, modelName, urlParam) {
			var that = this;

			function fSuccessExecutar(oEvent) {
				var oValue = new sap.ui.model.json.JSONModel(oEvent.results);

				if ( modelName === "ET_SH_EDUC_CURSO" ){	
					oValue.setSizeLimit(500);
				}

				that.getView().setModel(oValue, modelName);
				console.log("An error occured while reading" + modelName + "!");
			}

			function fErrorExecutar(oEvent) {
				console.log("An error occured while reading" + modelName + "!");
			}

			if (urlParam !== null & urlParam !== "" & urlParam !== undefined) {
				oModel.read(modelName, null, urlParam, false, fSuccessExecutar, fErrorExecutar);
			} else {
				oModel.read(modelName, null, null, false, fSuccessExecutar, fErrorExecutar);
			}
			// fSuccessExecutar();
		},

		//	--------------------------------------------
		//	onMasterLoaded
		//	--------------------------------------------
		onMasterLoaded: function (sChannel, sEvent, oData) {
			if (oData.oListItem) {
				this.bindView(oData.oListItem.getBindingContext().getPath());
				this.oInitialLoadFinishedDeferred.resolve();
			}
		},

		//	--------------------------------------------
		//	onRouteMatched
		//	--------------------------------------------
		onRouteMatched: function (oEvent) {
			var oParameters = oEvent.getParameters();

			jQuery.when(this.oInitialLoadFinishedDeferred).then(jQuery.proxy(function () {

				// When navigating in the Detail page, update the binding context 
				if (oParameters.name === "detail") {
					var sEntityPath = "/" + oParameters.arguments.entity;
					this.bindView(sEntityPath);
				} else {
					return;
				}
			}, this));
		},

		//	--------------------------------------------
		//	fValidAttachment
		//	--------------------------------------------		
		fValidAttachment: function () {
			// var count = this.getView().byId("upldAttachments").aItems.length;
			var table = this.getView().getModel("Attachments").getData().table;
			
			if (table.length == 0) {
				return false;
			} 
			
			if(!this.getView().byId('tAnexos')){
				return false;
			}
			
			var anexos = this.getView().byId('tAnexos').getRows();
			
			for(var i = 0; table.length > i; i++){
				var uploadCollection = anexos[i].getCells()[1].getItems()[0];
				if(!uploadCollection.getValue() && ( table[i].New === true || table[i].Old === false )){
					return false;
				}
			}
			return true; 
		},

		//	--------------------------------------------
		//	onDateChange
		//	--------------------------------------------
		onDateChange: function (oEvent) {
			var fieldname = oEvent.getParameter("id").substring(12);

			if (oEvent.getParameter("valid") === true) {
				this.fMessage("None", null, fieldname);
			} else {
				this.fMessage("Error", "entrada_invalida", fieldname);
			}

			// this.getView().byId("btnSanity").setVisible(false);
			this.getView().byId("btnAccept").setEnabled(true);
			this.getView().byId("btnSave").setEnabled(true);
		},
		//	--------------------------------------------
		//	fFillURLFilterParam
		//	--------------------------------------------		
		fFillURLFilterParam: function (param, value, url) {

			if (url === "" || typeof url === "undefined") {
				url = "$filter=";
			} else {
				url = url + " and ";
			}

			url = url + param + " eq '" + value + "'";
			return url;
		},

		//	--------------------------------------------
		//	onHelpRequestBirthCountry
		//	--------------------------------------------
		onHelpRequestBirthCountry: function () {
			var cols = [{
				label: "Código",
				template: "LAND1"
			}, {
				label: "Descrição",
				template: "LANDX"
			}];

			this.fHelpRequest("LAND1", "LANDX", cols, "ET_SH_COUNTRY", this, "País",
				"ipBirthCountry", "txtBirthCountry", false, false);
		},

		//	--------------------------------------------
		//	onHelpRequestState
		//	--------------------------------------------		
		onHelpRequestState: function () {
			var cols = [{
				label: "Código",
				template: "BLAND"
			}, {
				label: "Descrição",
				template: "BEZEI"
			}];

			this.fSearchHelpRegion();

			this.fHelpRequest("BLAND", "BEZEI", cols, "ET_SH_REGION", this, "Estado",
				"ipState", "txtState", false, false);
		},

		//	--------------------------------------------
		//	onHelpRequestNationality
		//	--------------------------------------------
		onHelpRequestNationality: function () {
			var cols = [{
				label: "País",
				template: "LAND1"
			}, {
				label: "Nacionalidade",
				template: "NATIO"
			}];

			this.fHelpRequest("LAND1", "NATIO", cols, "ET_SH_NATIONALITY", this, "Nacionalidade",
				"ipNationality", "txtNationality", false, false);
		},

		//	--------------------------------------------
		//	fSetGlobalInformation
		//		998 - Aberto
		//		997 - Salva
		//		996 - Erro
		//		995 - Não é aprovador	
		//      994 - Usuário sem permissão de acesso
		//      993 - Chave do banco inválida 
		//      992 - Finalizada com Sucesso 
		//      991 - Erro ao criar número de requisição 
		//      990 - Requisição Saneada
		//      989 - Requisição Finalizada
		//      988 - Requisição Cancelada
		//	--------------------------------------------
		fSetGlobalInformation: function (oEvent, that, requisitionId, ifIsTableType) {
			var globalData = {};
			var oStartupParameters = jQuery.sap.getUriParameters().mParams;

			globalData.IM_REQUISITION_ID = "00000000";
			globalData.IM_PERNR = "";
			globalData.IM_REQ_URL = "";
			globalData.IM_LOGGED_IN = "";
			globalData.IM_BUKRS = "";
			globalData.MSG_RET = "";
			globalData.NO_WORKFLOW = "";

			if (oStartupParameters.IM_REQUISITION_ID) {
				globalData.IM_REQ_URL = oStartupParameters.IM_REQUISITION_ID[0];
			}

			if (oStartupParameters.IM_PERNR) {
				globalData.IM_PERNR = oStartupParameters.IM_PERNR[0];
			}
			
			if (oStartupParameters.IM_BUKRS) {
				globalData.IM_BUKRS = oStartupParameters.IM_BUKRS[0];
			}

			if (oEvent) {
				if (ifIsTableType === undefined) {
					globalData.EX_IS_APPROVER = oEvent.EX_IS_APPROVER;
					globalData.IM_REQUISITION_ID = oEvent.BLOCK.REQUISITION_ID;
					globalData.IM_ACTION = oEvent.IM_ACTION;
					globalData.MSG = oEvent.EX_MESSAGE.NUMBER;
				} else {
					if (oEvent.results === undefined) {
						globalData.EX_IS_APPROVER = oEvent.EX_IS_APPROVER;
						globalData.IM_REQUISITION_ID = oEvent.EX_REQUISITION_ID;
						globalData.IM_ACTION = oEvent.IM_ACTION;
						globalData.MSG = oEvent.EX_MESSAGE.NUMBER;
					} else {
						globalData.EX_IS_APPROVER = oEvent.results[0].EX_IS_APPROVER;
						globalData.IM_REQUISITION_ID = requisitionId;
						globalData.IM_ACTION = oEvent.results[0].IM_ACTION;
						globalData.MSG = oEvent.results[0].EX_MESSAGE.NUMBER;
					}
				}
			}

			if (oStartupParameters.IM_PROFILE) {

				switch (oStartupParameters.IM_PROFILE[0]) {
				case "EM":
					globalData.IM_LOGGED_IN = 0;
					break;
				case "RH":
					globalData.IM_LOGGED_IN = 2;
					break;
				case "SSG":
					globalData.IM_LOGGED_IN = 5;
					this.fSSGJust();
					break;
				case "RHR":
					globalData.IM_LOGGED_IN = 6;
					break;
				case "SSMA":
					globalData.IM_LOGGED_IN = 7;
					break;
				case "ADM":
					globalData.IM_LOGGED_IN = 8;
					break;
				}
			}
			this.getView().setModel(globalData, "ET_GLOBAL_DATA");
		},

		//	--------------------------------------------
		//	fGetUrl
		//	--------------------------------------------		
		fGetUrl: function (imPernr, imRequisitionId, imLoggedIn) {
			var urlParam;

			urlParam = this.fFillURLParam("IM_PERNR", imPernr);
			urlParam = this.fFillURLParam("IM_REQUISITION_ID", imRequisitionId, urlParam);
			urlParam = this.fFillURLParam("IM_LOGGED_IN", imLoggedIn, urlParam, true);

			return urlParam;
		},

		fGetUrlBukrs: function (imPernr, imRequisitionId, imLoggedIn, imBukrs) {
			var urlParam;

			urlParam = this.fFillURLParam("IM_PERNR", imPernr);
			urlParam = this.fFillURLParam("IM_REQUISITION_ID", imRequisitionId, urlParam);
			urlParam = this.fFillURLParam("IM_BUKRS", imBukrs, urlParam);
			urlParam = this.fFillURLParam("IM_LOGGED_IN", imLoggedIn, urlParam, true);

			return urlParam;
		},
		//	--------------------------------------------
		//	fFillURLParam
		//	--------------------------------------------
		fFillURLParam: function (p_atrib, p_valor, p_param, p_final) {
			//monta URL de parametros para o Gateway (filter)
			if (p_param === "" || typeof p_param === "undefined") {
				p_param = "(";
			} else {
				if (p_valor === undefined || p_valor === "null") {
					p_valor = "";
				}
			}

			p_param = p_param + p_atrib + "='" + p_valor + "'";

			if (p_final === true) {
				p_param = p_param + ")";
			} else {
				p_param = p_param + ",";
			}

			return p_param;
		},

		//	--------------------------------------------
		//	fFillURLParamFilter
		//	--------------------------------------------		
		fFillURLParamFilter: function (p_atrib, p_valor, p_param) {
			//monta URL de parametros para o Gateway (filter)
			if (p_param === "" || typeof p_param === "undefined") {
				p_param = "$filter=";
			} else {
				p_param = p_param + " and ";
			}

			p_param = p_param + p_atrib + " eq '" + p_valor + "'";

			return p_param;
		},

		//	--------------------------------------------
		//	fGetLog
		//	--------------------------------------------		
		fGetLog: function () {
			var oModel = new sap.ui.model.odata.ODataModel("/sap/opu/odata/SAP/ZODHR_SS_RESP_DIGITAL_SRV/");
			var that = this;
			var oGlobalInformation = this.getView().getModel("ET_GLOBAL_DATA");

			this.addHighlightStyle();

			//Resets the CSS to all fields, aiming to avoid trash from others registries
			this.fResetFieldsColor(that);

			function fSuccess(oEvent) {
				for (var i = 0; i < oEvent.results.length; i++) {

					if (that.getView().byId(oEvent.results[i].FIELD)) {
						that.fSetFieldCssStyle(oEvent.results[i].FIELD, "highlight");
					}

					that.fVerifyObligatoryFieldsChanged(oEvent.results[i].FIELD);
				}
			}

			function fError(oEvent) {
				var message = $(oEvent.response.body).find("message").first().text();

				if (message.substring(2, 4) == "99") {
					var detail = ($(":contains(" + "/IWBEP/CX_SD_GEN_DPC_BUSINS" + ")", oEvent.response.body));
					var formattedDetail = detail[2].outerText.replace("/IWBEP/CX_SD_GEN_DPC_BUSINS", "");
					var zMessage = formattedDetail.replace("error", "");

					MessageBox.error(zMessage);

				} else {
					MessageBox.error(message);
				}
			}

			//Shows Log only in Approval Mode
			var urlParam = this.fFillURLParamFilter("REQUISITION_ID", oGlobalInformation.IM_REQUISITION_ID);
			urlParam = this.fFillURLParamFilter("IM_BUKRS", oGlobalInformation.IM_BUKRS, urlParam);
 
			oModel.read("ET_LOG", null, urlParam, false, fSuccess, fError);
		},

		//	--------------------------------------------
		//	fResetFieldsColor
		//	--------------------------------------------		
		fResetFieldsColor: function (that) {
			var labelsView = document.getElementsByTagName("label");

			for (var i = 0; i < labelsView.length; i++) {
				var labelId = labelsView[i].getAttribute("id");
				var fieldName = labelId.split("--");

				if (fieldName[1] !== undefined && fieldName[1].substring(0, 3) === "lbl") {
					that.fSetFieldCssStyle(fieldName[1], "default");
				}
			}
		},

		//	--------------------------------------------
		//	fSetFieldCssStyle
		//	--------------------------------------------		
		fSetFieldCssStyle: function (fieldName, classIns) {
			var oPropText = this.getView().byId(fieldName);
			var noUpdate = false;

			if (oPropText) {
				var aStyle = oPropText.aCustomStyleClasses;
				var classDel;

				//If it's inserting highlight, we need to remove "default" property and vice versa
				switch (classIns) {
				case "default":
					classDel = "highlight";
					break;
				case "highlight":
					classDel = "default";
					break;
				}

				if (aStyle !== undefined) {
					for (var i = 0; i < aStyle.length; i++) {
						if (aStyle[i] === classDel) {
							aStyle.splice(i, 1);
							oPropText.rerender();

						} else if (aStyle[i] === classIns) {
							noUpdate = true;
							break;
						}
					}

					//If the "Insert Class" has already been set to the field, don't update it, because if we do, 
					//we would have two equals style in the same field 
					if (noUpdate === false) {
						aStyle[i - 1] = classIns;
						oPropText.rerender();
					}
				}
			}
		},

		//	--------------------------------------------
		//	fVerifyObligatoryFieldsChanged
		//	--------------------------------------------
		fVerifyObligatoryFieldsChanged: function (field) {
			//If one field obligatory was found, it's not necessary to look the others. Just one l simbolyzes that
			//attachment is required 
			if (this.obligatoryChanged === false) {
				var labelField = this.getView().byId(field);

				if (labelField !== undefined && labelField.getRequired() === true) {
					this.obligatoryChanged = true;
				}
			}
		},

		//	--------------------------------------------
		//	fVerifyError
		//	--------------------------------------------		
		fVerifyError: function (field) {
			var fieldValue = this.getView().byId(field);

			if (fieldValue.getProperty("valueState") !== "Error") {
				return false;
			} else {
				return true;
			}
		},

		//	--------------------------------------------
		//	fReadModelFillDesc
		//	--------------------------------------------		
		fReadModelFillDesc: function (mockSubname, field, fieldTxt, keyColumnKey, keyColumnDesc) {
			//Get Model
			var oModelSH = sap.ui.getCore().getModel("MDL_SH");

			//Get values from view
			var oDataSH = oModelSH.getData();
			var fieldValue = this.getView().byId(field);
			var fieldDesc = this.getView().byId(fieldTxt);
			var valueExists = false;

			fieldDesc.setText("");

			//Verify if the inputed field value is valid
			for (var i = 0; i < oDataSH[mockSubname].length; i++) {
				if (fieldValue.getValue() === oDataSH[mockSubname][i][keyColumnKey]) {
					valueExists = true;
					break;
				}
			}

			//If so, fill the description with the corresponding value besides the key field. 
			//If not, clear description and indicates error to user
			if (valueExists === true) {
				fieldDesc.setText(oDataSH[mockSubname][i][keyColumnDesc] + " (" + oDataSH[mockSubname][i][keyColumnKey] + ")");
				this.fMessage("None", null, field);
			} else {

				if (fieldValue.getProperty("valueState") !== "Error") {
					this.fMessage("Error", "entrada_invalida", field);
				}
			}
		},

		//	--------------------------------------------
		//	fValidationObligatoryFields
		//	--------------------------------------------
		fValidationObligatoryFields: function (field) {
			var fieldValue = this.getView().byId(field).getValue();
			var fieldState = this.getView().byId(field);

			if (fieldValue === undefined || fieldValue === "") {
				this.fMessage("Error", "campo_obrigatorio", field);
			} else {

				if (fieldState.getProperty("valueState") === "Error" &
					fieldState.getProperty("valueStateText") === "Campo obrigatório") {

					this.fMessage("None", null, field);
				}
			}
		},

		//	--------------------------------------------
		//	getEventBus
		//	--------------------------------------------
		getEventBus: function () {
			return sap.ui.getCore().getEventBus();
		},

		//	--------------------------------------------
		//	getRouter
		//	--------------------------------------------
		getRouter: function () {
			return sap.ui.core.UIComponent.getRouterFor(this);
		},

		onExit: function () {
			// this.getEventBus().unsubscribe("Master2", "LoadFinished", this.onMasterLoaded, this);
		},

		//	--------------------------------------------
		//	onDetailSelect
		//	--------------------------------------------
		onDetailSelect: function (oEvent) {
			sap.ui.core.UIComponent.getRouterFor(this).navTo("detail", {
				entity: oEvent.getSource().getBindingContext().getPath().slice(1)
			}, true);
		},
		//	--------------------------------------------
		//	fireDetailChanged
		//	--------------------------------------------
		fireDetailChanged: function (sEntityPath) {
			this.getEventBus().publish("Detail", "Changed", {
				sEntityPath: sEntityPath
			});
		},

		//	--------------------------------------------
		//	fireDetailNotFound
		//	--------------------------------------------
		fireDetailNotFound: function () {
			this.getEventBus().publish("Detail", "NotFound");
		},

		//	--------------------------------------------
		//	bindView
		//	--------------------------------------------
		bindView: function (sEntityPath) {
			var oView = this.getView();
			oView.bindElement(sEntityPath);

			//Check if the data is already on the client
			if (!oView.getModel().getData(sEntityPath)) {

				// Check that the entity specified was found
				var oData = oView.getModel().getData(sEntityPath);
				if (!oData) {
					this.showEmptyView();
					this.fireDetailNotFound();
				} else {
					this.fireDetailChanged(sEntityPath);
				}

			} else {
				this.fireDetailChanged(sEntityPath);
			}

		},

		//	--------------------------------------------
		//	showEmptyView
		//	--------------------------------------------
		showEmptyView: function () {
			this.getRouter().myNavToWithoutHash({
				currentView: this.getView(),
				targetViewName: "autoServico.view.NotFound",
				targetViewType: "XML"
			});
		},

		// --------------------------------------------
		// fGetRequisitionId
		// --------------------------------------------
		fGetRequisitionId: function (oEvent) {
			var detail = $(oEvent.response.body).find("errordetail").first().text();

			if (detail.substring(0, 2) === "99" & detail.substring(3, 6) === "999") {
				return detail.substring(15, 23);
			}
		},

		// --------------------------------------------
		// fUnableAllButtons
		// --------------------------------------------		
		fUnableAllButtons: function () {
			var oView = this.getView();

			// oView.byId("btnSanity").setVisible(false);
			// oView.byId("btnSanity").setEnabled(false);
			oView.byId("btnSave").setVisible(false);
			oView.byId("btnSave").setEnabled(false);
			oView.byId("btnAccept").setVisible(false);
			oView.byId("btnAccept").setEnabled(false);
			oView.byId("btnApprove").setVisible(false);
			oView.byId("btnApprove").setEnabled(false);
			// oView.byId("btnReject").setVisible(false);
			// oView.byId("btnReject").setEnabled(false);
			oView.byId("btnCancel").setVisible(false);
			oView.byId("btnCancel").setEnabled(false);

			oView.byId("taJustSSG").setEditable(false);
		},

		// --------------------------------------------
		// fUnableApprovalButtons
		// --------------------------------------------		
		fUnableApprovalButtons: function () {
			var oView = this.getView();

			oView.byId("btnApprove").setEnabled(false);
			oView.byId("btnCancel").setEnabled(false);
			// oView.byId("btnReject").setEnabled(false);
		},

		// --------------------------------------------
		// fSaveAttachmentView
		// -------------------------------------------- 		
		fSaveAttachmentView: function (idReq) {
			var that = this;
			var oUploadCollection = that.getView().byId("upldAttachments");
			var count = oUploadCollection.aItems.length;

			for (var i = 0; i < count; i++) {
				if (oUploadCollection.aItems[i]._status == "pendingUploadStatus") {
					that.fSaveAttachment(idReq, oUploadCollection.aItems[i]._requestIdName, oUploadCollection.sId);
					oUploadCollection.fireUploadComplete();
					oUploadCollection.fireUploadTerminated();
				}
			}

		},

		// --------------------------------------------
		// fSaveAttachment
		// -------------------------------------------- 		
		fSaveAttachment: function (idReq, numFile, sId) {
			console.log("*** SAVE ATTACHMENT  ***");

			var that = this;
			var oDialog = that.getView().byId("BusyDialog");

			try {

				var file = jQuery.sap.domById(sId + "-" + parseInt(parseInt(numFile) + 1) + "-uploader-fu").files[0];

				if (file) {

					oDialog.open();

					this._bUploading = true;
					var that = this;

					/**
					 * **************To Fetch CSRF Token******************
					 */
					// var a = "/Yourservice URL or Metadata URL ";
					var a = "/sap/opu/odata/SAP/ZODHR_SS_MAINTENANCE_CADASTRAL_SRV";
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
					var oModel = new sap.ui.model.odata.ODataModel(
						// sUrl, true);
						a, true);
					sap.ui.getCore().setModel(oModel);
					OData.request(f, function (data, oSuccess) {

						var new_name = file.name;

						new_name = that.fRemoveSpecialCharsAttach(new_name);

						new_name = new_name.replace(/[^\x00-\x7F]/g, "");
						new_name = new_name.replace(/[^A-Za-z 0-9 \,\?""!@#\$%\^&\*\(\)-_=\+;:<>\/\\\|\}\{\[\]`~]*/g, '');
						new_name = new_name.replace(/[\u00A0\u1680​\u180e\u2000-\u2009\u200a​\u200b​\u202f\u205f​\u3000]/g, '');

						//removendo caracteres
						new_name = new_name.replace(/[ÀÁÂÃÄ]/g, "A");
						new_name = new_name.replace(/[àáâãäåã]/g, "a");
						new_name = new_name.replace(/[ÈÉÊË]/g, "E");
						new_name = new_name.replace(/[éèêë]/g, "e");
						new_name = new_name.replace(/[í]/g, "i");
						new_name = new_name.replace(/[Í]/g, "I");
						new_name = new_name.replace(/[ç]/g, "c");
						new_name = new_name.replace(/[Ç]/g, "C");
						new_name = new_name.replace(/[ÓÕ]/g, "O");
						new_name = new_name.replace(/[óõ]/g, "o");
						new_name = new_name.replace(/[úù]/g, "u");
						new_name = new_name.replace(/[ÚÙ]/g, "U");

						var oToken = oSuccess.headers['x-csrf-token'];
						/**
						 * ValidaÁao para o caso do navegador ser o Firefox/IE *
						 */
						if (oToken == null) {
							oToken = oSuccess.headers['X-CSRF-Token'];
						}
						oHeaders = {
							"X-CSRF-Token": oToken,
							"slug": idReq + new_name,
						};
						/**
						 * **************To Fetch CSRF Token****************** *
						 */

						/**
						 * **************To Upload File*********************** *
						 */
						var filetype = file.type;

						if (filetype == '') {
							filetype = 'application/octet-stream';
						}

						var oURL = a + "/ET_DMS";
						jQuery.ajax({
							type: 'POST',
							url: oURL,
							headers: oHeaders,
							cache: false,
							contentType: filetype,
							processData: false,
							data: file,
							async: false,
							success: function (data) {
								console.log("****upload***");
								console.log(file.name);

								var oUploadCollection = that.getView().byId("upldAttachments");
								oUploadCollection.aItems[parseInt(numFile) - 1]._status = "display";

								oDialog.close();
							},
							error: function (data) {
								console.log("****ERRO upload***");
								sap.m.MessageBox.error("Erro no processamento do arquivo " + file.name + ".");
								oDialog.close();
							}
						});

					});
				}

			} catch (oException) {
				jQuery.sap.log.error("Erro Conexão" + oException.message);
				oDialog.close();
			}

		},

		//	--------------------------------------------
		//	fMessageBox
		//	--------------------------------------------		
		fMessageBox: function (questionText, title, successText) {
			MessageBox.confirm(questionText, {
				title: title,
				initialFocus: sap.m.MessageBox.Action.CANCEL,
				onClose: function (sButton) {

					if (sButton === MessageBox.Action.OK) {
						if (successText) {
							MessageBox.success(successText);
						}
						return true;
					}
				}
			});
		},

		//	--------------------------------------------
		//	fMessage
		//	--------------------------------------------
		fMessage: function (type, msg, field) {
			var oBundle;

			//Get message text from i18n
			oBundle = this.getView().getModel("i18n").getResourceBundle();

			var message = oBundle.getText(msg);

			//Message text
			this.getView().byId(field).setValueStateText(message);

			//Set message in the field with the type and text
			this.getView().byId(field).setValueState(sap.ui.core.ValueState[type]);
		},

		//	--------------------------------------------
		//	fMessageThat
		//	--------------------------------------------
		fMessageThat: function (type, msg, field, that) {
			var oBundle;

			//Get message text from i18n
			oBundle = that.getView().getModel("i18n").getResourceBundle();

			var message = oBundle.getText(msg);

			//Message text
			that.getView().byId(field).setValueStateText(message);

			//Set message in the field with the type and text
			that.getView().byId(field).setValueState(sap.ui.core.ValueState[type]);
		},

		//	--------------------------------------------
		//	onNavBack
		//	--------------------------------------------
		onNavBack: function () {
			// This is only relevant when running on phone devices
			this.getRouter().myNavToWithoutHash({
				currentView: this.getView(),
				targetViewName: "autoServico.view.Master",
				targetViewType: "XML",
				transition: "slide"
			});
		},

		//	--------------------------------------------
		//	fSetHeader
		//	--------------------------------------------
		fSetHeader: function () {
			var oHeader = sap.ui.getCore().getModel("ET_HEADER");
			this.getView().setModel(oHeader, "ET_HEADER");
		},

		/*		//	--------------------------------------------
				//	fHighlightModifiedFields
				//	--------------------------------------------		
				fHighlightModifiedFields: function(that, fieldName) {
					var oPropText = this.getView().byId(fieldName);

					if (oPropText) {
						that.fHighlightModifiedFields(that, fieldName);
						//oPropText.addStyleClass("highlight");
					}

				},*/

		//	--------------------------------------------
		//	getClonedObject
		//	--------------------------------------------
		getClonedObject: function (object) {
			return JSON.parse(JSON.stringify(object));
		},

		//	--------------------------------------------
		//	onTypeMissmatch
		//	--------------------------------------------
		onTypeMissmatch: function () {

			var oBundle = this.getView().getModel("i18n").getResourceBundle();
			var message = oBundle.getText("msg_anexo");

			var bCompact = !!this.getView().$().closest(".sapUiSizeCompact").length;
			MessageBox.error(
				message, {
					styleClass: bCompact ? "sapUiSizeCompact" : ""
				}
			);

		},

		//	--------------------------------------------
		//	onFileSizeExceed
		//	--------------------------------------------
		onFileSizeExceed: function () {

			var oBundle = this.getView().getModel("i18n").getResourceBundle();
			var message = oBundle.getText("msg_anexo_tamanho");

			var bCompact = !!this.getView().$().closest(".sapUiSizeCompact").length;
			MessageBox.error(
				message, {
					styleClass: bCompact ? "sapUiSizeCompact" : ""
				}
			);

		},
		//	--------------------------------------------
		//	onFilenameLengthExceed
		//	--------------------------------------------
		onFilenameLengthExceed: function () {

			var oBundle = this.getView().getModel("i18n").getResourceBundle();
			var message = oBundle.getText("msg_anexo_tamanho_nome");

			var bCompact = !!this.getView().$().closest(".sapUiSizeCompact").length;
			MessageBox.error(
				message, {
					styleClass: bCompact ? "sapUiSizeCompact" : ""
				}
			);

		},

		//	--------------------------------------------
		//	onUploadComplete
		//	--------------------------------------------
		onUploadComplete: function () {
			var oBundle = this.getView().getModel("i18n").getResourceBundle();
		},

		//	--------------------------------------------
		//	addHighlightStyle - FC0D0D - rgb(252, 13, 13)
		//	--------------------------------------------
		addHighlightStyle: function () {
			var oStyle = document.createElement("STYLE");
			oStyle.innerText =
				"@keyframes diminished {color:#999 !important; background-color: #FFF; } .highlight { color:#FC0D0D!important; } .default { color:#666B6F!important; }";
			oStyle.setAttribute("type", "text/css");
			document.getElementsByTagName("HEAD")[0].appendChild(oStyle);
		},

		handleErrorMessageAttachment: function (oEvent) {
			var oBundle = this.getView().getModel("i18n").getResourceBundle();
			var message = oBundle.getText("erro_anexo_obrigatorio");

			var bCompact = !!this.getView().$().closest(".sapUiSizeCompact").length;
			MessageBox.error(
				message, {
					styleClass: bCompact ? "sapUiSizeCompact" : ""
				}
			);
		},

		handleErrorMessageBank: function (oEvent) {
			sap.m.MessageBox.error(
				"É necessário incluir comprovante dos dados bancários, tais como:\n\n Ø  Comprovante de criação de conta, ou\n Ø  Foto da frente do cartão."
			);
		},

		handleErrorMessageAttachmentRetirement: function (oEvent) {
			var oBundle = this.getView().getModel("i18n").getResourceBundle();
			var message = oBundle.getText("erro_anexo_obrigatorio_aposentadoria");

			var bCompact = !!this.getView().$().closest(".sapUiSizeCompact").length;
			MessageBox.error(
				message, {
					styleClass: bCompact ? "sapUiSizeCompact" : ""
				}
			);
		},

		handleErrorMessageBoxPress: function (oEvent) {

			var oBundle = this.getView().getModel("i18n").getResourceBundle();
			var message = oBundle.getText("erro_campo_obrigatorio");

			var bCompact = !!this.getView().$().closest(".sapUiSizeCompact").length;
			MessageBox.error(
				message, {
					styleClass: bCompact ? "sapUiSizeCompact" : ""
				}
			);
		},

		handleErrorMessageBoxDisapprove: function (oEvent) {

			var oBundle = this.getView().getModel("i18n").getResourceBundle();
			var message = oBundle.getText("erro_just_ssg_obrig");

			var bCompact = !!this.getView().$().closest(".sapUiSizeCompact").length;
			MessageBox.error(
				message, {
					styleClass: bCompact ? "sapUiSizeCompact" : ""
				}
			);
		},

		//	--------------------------------------------
		//	handleValueHelp 
		//	--------------------------------------------		
		handleValueHelp: function (oEvent) {

			if (oEvent.getSource().data("field") != null) {
				if (oEvent.getSource().data("field") == "State") {
					this.fSearchHelpRegion();
				} else if (oEvent.getSource().data("field") == "Birthplace") {
					this.fSearchHelpBirthPlace();
				} else if (oEvent.getSource().data("field") == "Certificado") {
					this.fSearchHelpCertificado();
				}
			}

			var sInputValue = oEvent.getSource().getValue();

			this.inputId = oEvent.getSource().getId();

			// create value help dialog
			this._valueHelpDialog = sap.ui.xmlfragment(
				oEvent.getSource().data("fragment"),
				this
			);
			this.getView().addDependent(this._valueHelpDialog);

			// open value help dialog
			this._valueHelpDialog.open(sInputValue);
		},

		//	--------------------------------------------
		//	_handleValueHelpSearch 
		//	--------------------------------------------
		_handleValueHelpSearch: function (oEvent) {
			var sValue = oEvent.getParameter("value");

			var oFilter = new Filter(
				oEvent.getSource().data("description"),
				sap.ui.model.FilterOperator.Contains, sValue
			);
			oEvent.getSource().getBinding("items").filter([oFilter]);
		},

		//	--------------------------------------------
		//	_handleValueHelpClose 
		//	--------------------------------------------
		_handleValueHelpClose: function (oEvent) {

			var oSelectedItem = oEvent.getParameter("selectedItem");
			if (oSelectedItem) {
				var productInput = this.getView().byId(this.inputId);

				if (oEvent.getSource().data("getParam") != null) {
					if (oEvent.getSource().data("getParam") == "Title") {
						productInput.setValue(oSelectedItem.getTitle());
					} else if (oEvent.getSource().data("getParam") == "Description") {
						productInput.setValue(oSelectedItem.getDescription());
					}
				} else {
					productInput.setValue(oSelectedItem.getTitle());
				}

			}
			oEvent.getSource().getBinding("items").filter([]);

			// if (oEvent.getSource().data("lblText") !== "") {
			if (oEvent.getSource().data("lblText") !== null) {
				this.getView().byId(oEvent.getSource().data("lblText")).setText(oSelectedItem.getDescription());
			}

			if (oEvent.getSource().data("input") != null) {
				this.getView().byId(oEvent.getSource().data("input")).fireChange();
			}

		},
		fAttachmentValid: function(){
			var oAttachment = this.getView().getModel("Attachments").getData();
			if(oAttachment.table.length < 1){
				return false;
			}else{
				return true;
			}
		}

	});

});