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

	return BaseController.extend("autoServico.view.DetailBankData", {

		onInit: function () {
			this.changedData = [];
			this.company = "";
			this.oInitialLoadFinishedDeferred = jQuery.Deferred();

			if (sap.ui.Device.system.phone) {
				//Do not wait for the master2 when in mobile phone resolution
				this.oInitialLoadFinishedDeferred.resolve();
			} else {
				var oEventBus = this.getEventBus();
				// oEventBus.subscribe("Master2", "LoadFinished", this.onMasterLoaded, this);
			}

			var oAtt = new JSONModel({
				table: []
			});
			this.getView().setModel(oAtt, "Attachments");

			this.fValidaCompany();
			this.getRouter().attachRouteMatched(this.onRouteMatched, this);
			this.fSetHeader();
			this.fSetGlobalInformation();
			//this.fGetBlock();
			//this.getView().byId("cbSalaryCount").fireSelect();
			//this.getAttachment();

			const that = this;
			this.getView().addEventDelegate({onBeforeShow: function(oEvent){that.initializeState(that)}}, this.getView());
		},
		initializeState: function(ref) {
			const sDialogName = 'Anexo';
			if(ref.mDialogs[sDialogName] && ref.mDialogs[sDialogName] !== {}){
				ref.mDialogs[sDialogName].destroy();
			}
			ref.mDialogs[sDialogName] = {};
			ref.fGetBlock();
			ref.getView().byId("cbSalaryCount").fireSelect();
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

			function fSuccess(oEvent) {

				var is_approver = oEvent.EX_IS_APPROVER;
				var oValue = new sap.ui.model.json.JSONModel(oEvent.BLOCK);

				that.getView().setModel(oValue, "ET_BANK_DET");
				that.getView().byId("taJust").setValue(oEvent.OBSERVATION);

				if (oEvent.OBSERVATION_SSG !== null && oEvent.OBSERVATION_SSG !== "" && oEvent.OBSERVATION_SSG !== undefined) {
					that.getView().byId("taJustSSG").setValue(oEvent.OBSERVATION_SSG);
					that.getView().byId("formJustificationSSG").setVisible(true);
				}

				that.fFillBankDetails(oValue.oData, that);

				// se tem id verificar os anexos
				if (oEvent.BLOCK.REQUISITION_ID !== "00000000") {

					var filters = [];

					filters = [new sap.ui.model.Filter("IDREQ", sap.ui.model.FilterOperator.EQ, oEvent.BLOCK.REQUISITION_ID)];

					that.getView().setModel(oModel, "anexo");

					// Update list binding
					that.getView().byId("upldAttachments").getBinding("items").filter(filters);

				}

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
				that.fBankList();
				that.fGetLog();

				if (oEvent.EX_IS_APPROVER == "X" && oEvent.IM_LOGGED_IN == "5") {
					// that.getView().byId("btnCopy").setVisible(true);
					// that.getView().byId("formSSGDate").setVisible(true);
				}

				var oGlobalDataMSG = that.getView().getModel("ET_GLOBAL_DATA");

				if (oEvent.IM_LOGGED_IN == "0" && oEvent.BLOCK.REQUISITION_ID != '00000000' && oEvent.BLOCK.REQUISITION_ID != undefined &&
					oGlobalDataMSG.MSG == "998") {

					if ((that.getView().byId("ipBankAgencyBC").getValue() != null &&
							that.getView().byId("ipBankAgencyBC").getValue() != undefined &&
							that.getView().byId("ipBankAgencyBC").getValue() != "") ||
						(that.getView().byId("ipBankAgencyBCCod").getValue() != null &&
							that.getView().byId("ipBankAgencyBCCod").getValue() != undefined &&
							that.getView().byId("ipBankAgencyBCCod").getValue() != "") ||
						(that.getView().byId("ipBankAccountBC").getValue() != null &&
							that.getView().byId("ipBankAccountBC").getValue() != undefined &&
							that.getView().byId("ipBankAccountBC").getValue() != "") ||
						(that.getView().byId("ipBankAccountBCCod").getValue() != null &&
							that.getView().byId("ipBankAccountBCCod").getValue() != undefined &&
							that.getView().byId("ipBankAccountBCCod").getValue() != "")
					) {
						that.getView().byId("cbSalaryCount").setSelected(true);
						that.getView().byId("formBankingCoordSuppliers").setVisible(true);
					}

				}
			}

			function fError(oEvent) {
				var message = $(oEvent.response.body).find("message").first().text();

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

			oModel.read("ET_BANK_DET" + urlParam, null, null, false, fSuccess, fError);
		},

		//	--------------------------------------------
		//	fBankList
		//	--------------------------------------------
		fBankList: function () {
			var oHeader = this.getView().getModel("ET_HEADER");

			var bankList = [];

			if (oHeader.oData.WERKS == 'BRDL' || oHeader.oData.WERKS == 'BRDT' ||
				oHeader.oData.WERKS == 'BREE' || oHeader.oData.WERKS == 'BREM' ||
				oHeader.oData.WERKS == 'BRNK' || oHeader.oData.WERKS == 'BRDZ' ||
				oHeader.oData.WERKS == 'BRTD' || oHeader.oData.WERKS == 'BRTB' ||
				oHeader.oData.WERKS == 'BRTA' || oHeader.oData.WERKS == 'BRNQ' ||
				oHeader.oData.WERKS == 'BRTC' || oHeader.oData.WERKS == 'BRPH' ||
				oHeader.oData.WERKS == 'BRTG' || oHeader.oData.WERKS == 'BRMB' ||
				oHeader.oData.WERKS == 'BRNB' || oHeader.oData.WERKS == 'BRXB' ||
				oHeader.oData.WERKS == 'BRND' || oHeader.oData.WERKS == 'BRFE' ||
				oHeader.oData.WERKS == 'BRNR') {

				bankList[0] = {};
				bankList[0].KEY = "0019";
				bankList[0].TEXT = "Banco do Brasil";
				bankList[1] = {};
				bankList[1].KEY = "2372";
				bankList[1].TEXT = "Bradesco";
				bankList[2] = {};
				bankList[2].KEY = "0337";
				bankList[2].TEXT = "Santander";

			} else if (oHeader.oData.WERKS == 'BRIC') {

				bankList[0] = {};
				bankList[0].KEY = "2372";
				bankList[0].TEXT = "Bradesco";
				bankList[1] = {};
				bankList[1].KEY = "0337";
				bankList[1].TEXT = "Santander";

			} else {
				bankList[0] = {};
				bankList[0].KEY = "0337";
				bankList[0].TEXT = "Santander";
			}

			var oBankList = new sap.ui.model.json.JSONModel(bankList);
			this.getView().setModel(oBankList, "ET_BANKLIST");

		},

		//	--------------------------------------------
		//	fGetLog
		//	--------------------------------------------		
		fGetLog: function () {
			var oModel = new sap.ui.model.odata.ODataModel("/sap/opu/odata/SAP/ZODHR_SS_RESP_DIGITAL_SRV/");
			var oGlobalInformation = this.getView().getModel("ET_GLOBAL_DATA");
			var that = this;

			this.addHighlightStyle();

			//Resets the CSS to all fields, aiming to avoid trash from others registries
			this.fResetFieldsColor(that);

			function fSuccess(oEvent) {
				for (var i = 0; i < oEvent.results.length; i++) {
					that.fbankLogFields(oEvent.results[i].FIELD, that);
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

			var urlParam = this.fFillURLParamFilter("REQUISITION_ID", oGlobalInformation.IM_REQUISITION_ID);
			oModel.read("ET_LOG", null, urlParam, false, fSuccess, fError);
		},

		//	--------------------------------------------
		//	fbankLogFields
		//	--------------------------------------------
		fbankLogFields: function (fieldName, that) {
			that.fHighlightMainBank(fieldName, that);
			that.fHighlightRefundBank(fieldName, that);
		},

		//	--------------------------------------------
		//	fHighlightMainBank
		//	--------------------------------------------		
		fHighlightMainBank: function (fieldName, that) {
			var bank = that.getView().byId("slBankKeyMBD").getSelectedKey();

			if (fieldName === "lblAgenciaPrincipal") {
				that.fSetFieldCssStyle("lblBankKeyMBD", "highlight");
				that.fSetFieldCssStyle("lblBankAgencyMBD", "highlight");
			}

			switch (bank) {
			case "2372": //Bradesco
				that.fHighlightBradescoMB(fieldName, that);
				break;

			case "3417": //Itaú
				that.fHighlightItauMB(fieldName, that);
				break;

			default:
				that.fHighlightOthersBanksMB(fieldName, that);
				break;
			}
		},

		//	--------------------------------------------
		//	fHighlightRefundBank
		//	--------------------------------------------		
		fHighlightRefundBank: function (fieldName, that) {
			var bank = that.getView().byId("slBankKeyBC").getSelectedKey();

			if (fieldName === "lblAgenciaReembolso") {

				that.fSetFieldCssStyle("lblBankKeyBC", "highlight");
				that.fSetFieldCssStyle("lblBankAgencyBC", "highlight");
			}

			switch (bank) {
			case "2372": //Bradesco
				that.fHighlightBradesco(fieldName, that);
				break;

			case "3417": //Itaú
				that.fHighlightItau(fieldName, that);
				break;

			default:
				that.fHighlightOthersBanks(fieldName, that);
				break;
			}
		},

		//	--------------------------------------------
		//	fHighlightBradescoMB
		//	--------------------------------------------			
		fHighlightBradescoMB: function (fieldName, that) {
			switch (fieldName) {
			case "lblContaPrincipal":

				that.fSetFieldCssStyle("lblBankAccountMBD", "highlight");
				that.fSetFieldCssStyle("lblBankAccountMBDCod", "highlight");
				break;

			case "lblDigitosPrincipal":
				that.fSetFieldCssStyle("lblBankAgencyMBDCod", "highlight");
				break;
			}
		},

		//	--------------------------------------------
		//	fHighlightItauMB
		//	--------------------------------------------			
		fHighlightItauMB: function (fieldName, that) {
			switch (fieldName) {
			case "lblAgenciaPrincipal":

				that.fSetFieldCssStyle("lblBankAgencyMBD", "highlight");
				break;

			case "lblContaPrincipal":

				that.fSetFieldCssStyle("lblBankAccountMBD", "highlight");
				break;

			case "lblDigitosPrincipal":

				that.fSetFieldCssStyle("lblBankAccountMBDCod", "highlight");
				break;
			}
		},

		//	--------------------------------------------
		//	fHighlightOthersBanksMB
		//	--------------------------------------------			
		fHighlightOthersBanksMB: function (fieldName, that) {
			switch (fieldName) {
			case "lblContaPrincipal":

				that.fSetFieldCssStyle("lblBankAccountMBD", "highlight");
				break;

			case "lblDigitosPrincipal":

				that.fSetFieldCssStyle("lblBankAgencyMBDCod", "highlight");
				that.fSetFieldCssStyle("lblBankAccountMBDCod", "highlight");
				break;
			}
		},

		//	--------------------------------------------
		//	fHighlightBradesco
		//	--------------------------------------------			
		fHighlightBradesco: function (fieldName, that) {
			switch (fieldName) {
			case "lblContaReembolso":

				that.fSetFieldCssStyle("lblBankAccountBC", "highlight");
				that.fSetFieldCssStyle("lblBankAccountBCCod", "highlight");
				break;

			case "lblDigitosReembolso":

				that.fSetFieldCssStyle("lblBankAgencyBCCod", "highlight");
				break;
			}
		},

		//	--------------------------------------------
		//	fHighlightItau
		//	--------------------------------------------			
		fHighlightItau: function (fieldName, that) {
			switch (fieldName) {
			case "lblAgenciaReembolso":

				that.fSetFieldCssStyle("lblBankAgencyBCCod", "highlight");
				break;

			case "lblContaReembolso":

				that.fSetFieldCssStyle("lblBankAccountBC", "highlight");
				break;

			case "lblDigitosReembolso":

				that.fSetFieldCssStyle("lblBankAccountBCCod", "highlight");
				break;
			}
		},

		//	--------------------------------------------
		//	fHighlightOthersBanks
		//	--------------------------------------------			
		fHighlightOthersBanks: function (fieldName, that) {
			switch (fieldName) {
			case "lblContaReembolso":

				that.fSetFieldCssStyle("lblBankAccountBC", "highlight");
				break;

			case "lblDigitosReembolso":

				that.fSetFieldCssStyle("lblBankAgencyBCCod", "highlight");
				that.fSetFieldCssStyle("lblBankAccountBCCod", "highlight");
				break;
			}
		},

		//	--------------------------------------------
		//	fFillBankDetails
		//	--------------------------------------------		
		fFillBankDetails: function (oValue, that) {
			var oView = that.getView();

			var bankMB = oValue.BANKL0.substring(0, 3);
			var accountNumberMainBank;
			var agencyDigitMainBank;
			var accountDigitMainBank;
			var agencyNumberMainBank;
			if (this.company == "ELEK") {
				agencyNumberMainBank = oValue.BANKL0.substring(4, 9);
			} else {
				agencyNumberMainBank = oValue.BANKL0.substring(5, 9);
			}
			if (bankMB !== "" & bankMB !== " " & bankMB !== undefined & bankMB !== null) {
				switch (bankMB) {
				case "237": //Bradesco
					accountNumberMainBank = oValue.BANKN0;
					accountDigitMainBank = oValue.BANKN0.substring(8, 9);
					agencyDigitMainBank = oValue.BKONT0;
					break;

				case "341": //Itaú
					accountNumberMainBank = oValue.BANKN0;
					accountDigitMainBank = oValue.BKONT0;
					agencyDigitMainBank = "";
					//oView.byId("ipBankAgencyBCCod").setEditable(false);
					break;

				default: //Others
					accountNumberMainBank = oValue.BANKN0;
					agencyDigitMainBank = oValue.BKONT0.substring(0, 1);
					accountDigitMainBank = oValue.BANKN0.substring(9, 10);
					break;
				}

				if (bankMB === "341") {
					this.getView().byId("lblBankAgencyMBDCod").setRequired(false);
					this.getView().byId("ipBankAgencyMBDCod").setRequired(false);
				} else {
					this.getView().byId("lblBankAgencyMBDCod").setRequired(false);
					this.getView().byId("ipBankAgencyMBDCod").setRequired(false);
				}
			}

			if (this.company == "ELEK") {
				agencyDigitMainBank = oValue.BKONT0.substring(0, 1);
				accountDigitMainBank = oValue.BKONT0.substring(1, 2);
			}

			var bankBC = oValue.BANKLBR04.substring(0, 3);
			var agencyNumberBC;
			var accountNumberBC;
			var agencyDigitBC;
			var accountDigitBC;

			if (this.company == "ELEK") {
				agencyNumberBC = oValue.BANKLBR04.substring(3, 9);
			} else {
				agencyNumberBC = oValue.BANKLBR04.substring(4, 9);
			}

			if (bankBC !== "" & bankBC !== " " & bankBC !== undefined & bankBC !== null) {

				if (this.company != "ELEK") {
					switch (bankBC) {
					case "001": //Banco do Brasil

						agencyDigitBC = oValue.BKONTBR04.substring(0, 1);
						accountDigitBC = oValue.BKONTBR04.substring(1, 2);
						this.getView().byId("ipBankAgencyBCCod").setRequired(true);
						this.getView().byId("lblBankAgencyBCCod").setRequired(true);
						this.getView().byId("ipBankAgencyBCCod").setVisible(true);
						this.getView().byId("lblBankAgencyBCCod").setVisible(true);
						break;

					default: //Others

						accountDigitBC = "";
						agencyDigitBC = "";

						this.getView().byId("lblBankAgencyBCCod").setRequired(false);
						this.getView().byId("ipBankAgencyBCCod").setRequired(false);
						this.getView().byId("lblBankAgencyBCCod").setVisible(false);
						this.getView().byId("ipBankAgencyBCCod").setVisible(false);

						this.getView().byId("lblBankAccountBCCod").setRequired(false);
						this.getView().byId("ipBankAccountBCCod").setRequired(false);
						this.getView().byId("lblBankAccountBCCod").setVisible(false);
						this.getView().byId("ipBankAccountBCCod").setVisible(false);
						break;
						// if(this.company == "ELEK"){
						// 	agencyNumberBC = oValue.BANKLBR04.substring(4, 9);
						// }else{
						// 	agencyNumberBC = oValue.BANKLBR04.substring(4, 9);
						// }
						// accountNumberBC = oValue.BANKNBR04;
						// agencyDigitBC = oValue.BKONTBR04.substring(0, 1);
						// accountDigitBC = oValue.BKONTBR04.substring(1, 2);
						// //accountDigitBC = oValue.BANKNBR04.substring(0, 10);
						// break;

					}

				} else {

					switch (bankBC) {
					case "237": //Bradesco

						agencyDigitBC = oValue.BKONTBR04.substring(0, 1);
						accountDigitBC = oValue.BKONTBR04.substring(1, 2);
						this.getView().byId("ipBankAgencyBCCod").setRequired(true);
						this.getView().byId("lblBankAgencyBCCod").setRequired(true);
						this.getView().byId("ipBankAgencyBCCod").setVisible(true);
						this.getView().byId("lblBankAgencyBCCod").setVisible(true);
						break;

					default: //Others

						accountDigitBC = "";
						agencyDigitBC = "";

						this.getView().byId("lblBankAgencyBCCod").setRequired(false);
						this.getView().byId("ipBankAgencyBCCod").setRequired(false);
						this.getView().byId("lblBankAgencyBCCod").setVisible(false);
						this.getView().byId("ipBankAgencyBCCod").setVisible(false);

						this.getView().byId("lblBankAccountBCCod").setRequired(false);
						this.getView().byId("ipBankAccountBCCod").setRequired(false);
						this.getView().byId("lblBankAccountBCCod").setVisible(false);
						this.getView().byId("ipBankAccountBCCod").setVisible(false);
						break;

					}
				}

				agencyNumberBC = oValue.BANKLBR04.substring(5, 10);
				accountNumberBC = oValue.BANKNBR04;

				//OTHER BANK
				oView.byId("slBankKeyBC").setSelectedKey(oValue.BANKLBR04.substring(0, 4));
				oView.byId("ipBankAgencyBC").setValue(agencyNumberBC);
				oView.byId("ipBankAgencyBCCod").setValue(agencyDigitBC);
				oView.byId("ipBankAccountBC").setValue(accountNumberBC);
				oView.byId("ipBankAccountBCCod").setValue(accountDigitBC);
				//oView.byId("cbSalaryCount").setSelected(true);

			} else {
				oView.byId("cbSalaryCount").setSelected(false);
				oView.byId("formBankingCoordSuppliers").setVisible(false);
			}

			//MAIN BANK - SANTANDER
			oView.byId("ipBankAgencyMBD").setValue(agencyNumberMainBank);
			oView.byId("ipBankAgencyMBDCod").setValue(agencyDigitMainBank);
			oView.byId("ipBankAccountMBD").setValue(accountNumberMainBank);
			oView.byId("ipBankAccountMBDCod").setValue(accountDigitMainBank);

			oView.byId("ipBankKeyMBD").setValue(oValue.BANKA0);
			oView.byId("ipBankKeyBC").setValue(oValue.BANKABR04);
			oView.byId("slBankKeyMBD").setSelectedKey(oValue.BANKL0.substring(0, 3));

			if (oValue.CHECKING_ACCOUNT == "true") {
				oView.byId("cbSalaryCount").setSelected(true);
			} else {
				oView.byId("cbSalaryCount").setSelected(false);
			}
		},

		//	--------------------------------------------
		//	onBankKeyBCChange
		//	--------------------------------------------		
		onBankKeyBCChange: function (oEvent) {
			var bankAgencyBCCod = this.getView().byId("ipBankAgencyBCCod");
			var codStatus = false;
			var attribute;

			if (oEvent.oSource.getSelectedKey() !== "0019") {
				bankAgencyBCCod.setValue("");
				attribute = false;
				codStatus = false;
			} else {
				attribute = true; //Others
				codStatus = true;
			}

			this.fObligatoryDigitBank(oEvent.oSource.getSelectedKey());
			// this.getView().byId("ipBankAgencyBCCod").setRequired(codStatus);
			// this.getView().byId("lblBankAgencyBCCod").setRequired(codStatus);
			this.getView().byId("ipBankAgencyBCCod").setVisible(codStatus);
			this.getView().byId("lblBankAgencyBCCod").setVisible(codStatus);

			this.getView().byId("btnAccept").setEnabled(true);
		//	this.getView().byId("btnSave").setEnabled(true);
		    this.getView().byId("btnSave").setEnabled(false); //TGE388990
		},

		//	--------------------------------------------
		//	onBankKeyMBChange
		//	--------------------------------------------		
		onBankKeyMBChange: function (oEvent) {
			var bankAgencyMBCod = this.getView().byId("ipBankAgencyMBDCod");
			var lblBankAgencyMBCod = this.getView().byId("lblBankAgencyMBDCod");
			var attribute;

			if (oEvent.oSource.getSelectedKey() === "3417") { //Itaú
				bankAgencyMBCod.setValue("");
				attribute = false;
			} else {
				attribute = true; //Others
			}

			bankAgencyMBCod.setEditable(attribute);
			lblBankAgencyMBCod.setRequired(attribute);

			// this.getView().byId("btnSanity").setVisible(false);
			this.getView().byId("btnAccept").setEnabled(true);
			//this.getView().byId("btnSave").setEnabled(true);
			this.getView().byId("btnSave").setEnabled(false); //TGE388990
		},

		//	--------------------------------------------
		//	onFieldChange
		//	--------------------------------------------		
		onFieldChange: function (oEvent) {
			var field = oEvent.getParameter("id").substring(12);
			this.changedData.push(field);                        
			var fieldValue = this.getView().byId(field).getValue();
			var isNum = /^\d+$/.test(fieldValue);

			this.fMessage("None", null, field);
			// field === "ipBankAccountBC" || 
			if (field === "ipBankAccountMBD" ||
				field === "ipBankAgencyBC" || field === "ipBankAgencyMBD") {

				if (isNum === false & fieldValue !== "") {
					this.fMessage("Error", "entrada_invalida", field);
				} else {
					if ((field === "ipBankAgencyBC" || field === "ipBankAgencyMBD") & fieldValue.length < 4 & fieldValue.length > 0) {
						this.fMessage("Error", "agencia_bancaria_erro", field);
					} else {
						this.fValidationObligatoryFields(field);
					}
				}
			}

			// this.getView().byId("btnSanity").setVisible(false);
			this.getView().byId("btnAccept").setEnabled(true);
			//this.getView().byId("btnSave").setEnabled(true);
			this.getView().byId("btnSave").setEnabled(false); //tge388990
		},

		// --------------------------------------------
		// onSalaryCountSelect
		// --------------------------------------------  		
		onSalaryCountSelect: function (oEvent) {
			var vlSelected = this.getView().byId("slBankKeyBC").getFirstItem().getKey();
			var setVisible = false;
			var marked;

			if (oEvent.oSource.getSelected() === true) {
				marked = "X";
			} else {
				marked = "";
			}

			//If checkbox is selected, set visible other fields
			if (marked === "X") {
				setVisible = true;
				
				this.fObligatoryDigitBank(vlSelected); //TGE388990
				
			}

			this.getView().byId("formBankingCoordSuppliers").setVisible(setVisible);
		},

		// --------------------------------------------
		// fClearReimbursementBankData
		// --------------------------------------------		
		fClearReimbursementBankData: function () {
			this.getView().byId("ipBankAgencyBC").setValue("");
			this.getView().byId("ipBankAgencyBCCod").setValue("");
			this.getView().byId("ipBankAccountBC").setValue("");
			this.getView().byId("ipBankAccountBCCod").setValue("");
		},

		// --------------------------------------------
		// fValidInputFields
		// --------------------------------------------  		
		fValidInputFields: function () {
			this.fObligatoryFields();

			var ipBankAgencyMBD = this.fVerifyError("ipBankAgencyMBD");
			var ipBankAgencyMBDCod = this.fVerifyError("ipBankAgencyMBDCod");
			var ipBankAccountMBD = this.fVerifyError("ipBankAccountMBD");
			var ipBankAccountMBDCod = this.fVerifyError("ipBankAccountMBDCod");
			var ipBankAgencyBC = this.fVerifyError("ipBankAgencyBC");
			var ipBankAgencyBCCod = this.fVerifyError("ipBankAgencyBCCod");
			var ipBankAccountBC = this.fVerifyError("ipBankAccountBC");
			var ipBankAccountBCCod = this.fVerifyError("ipBankAccountBCCod");

			if (ipBankAgencyMBD === false && ipBankAgencyMBDCod === false && ipBankAccountMBD === false &&
				ipBankAccountMBDCod === false && ipBankAgencyBC === false && ipBankAgencyBCCod === false &&
				ipBankAccountBC === false && ipBankAccountBCCod === false) {

				return false;
			} else {
				return true;
			}
		},
		
		//TGE388990
		fObligatoryDigitBank: function (bank) {
			
			if(bank === "0019"){ //Banco do Brasil
				var lv_required = true;
			}else{
				lv_required = false;
				this.getView().byId("ipBankAgencyBCCod").setValueState(sap.ui.core.ValueState.None);	
				this.getView().byId("ipBankAgencyBCCod").setValue("");
			}
			
			this.getView().byId("ipBankAgencyBCCod").setRequired(lv_required);
			this.getView().byId("lblBankAgencyBCCod").setRequired(lv_required);
			
		},

		//	--------------------------------------------
		//	fObligatoryFields
		//	--------------------------------------------
		fObligatoryFields: function () {
			this.fValidationObligatoryFields("ipBankAgencyMBD");
			this.fValidationObligatoryFields("ipBankAccountMBD");
			// this.fValidationObligatoryFields("ipBankAccountMBDCod");

			if (this.getView().byId("ipBankAgencyMBDCod").getRequired() === true) {
				this.fValidationObligatoryFields("ipBankAgencyMBDCod");
			}

			if (this.getView().byId("cbSalaryCount").getSelected() === true) {
				this.fValidationObligatoryFields("ipBankAgencyBC");
				this.fValidationObligatoryFields("ipBankAccountBC");

				if (this.getView().byId("ipBankAgencyBCCod").getRequired() === true) {
					this.fValidationObligatoryFields("ipBankAgencyBCCod");
				}

			} else {
				this.fMessage("None", null, "ipBankAgencyBC");
				this.fMessage("None", null, "ipBankAgencyBCCod");
				this.fMessage("None", null, "ipBankAccountBC");
				this.fMessage("None", null, "ipBankAccountBCCod");

			}
		},

		//--------------------------------------------
		//	fUnableFields
		//--------------------------------------------	
		fUnableFields: function (closeButtons) {
			var oView = this.getView();

			oView.byId("ipBankAgencyMBD").setEditable(false);
			oView.byId("ipBankAgencyMBDCod").setEditable(false);
			oView.byId("ipBankAccountMBD").setEditable(false);
			oView.byId("ipBankAccountMBDCod").setEditable(false);
			oView.byId("cbSalaryCount").setEditable(false);
			oView.byId("slBankKeyBC").setEnabled(false);
			oView.byId("slBankKeyMBD").setEnabled(false);
			oView.byId("ipBankAgencyBC").setEditable(false);
			oView.byId("ipBankAgencyBCCod").setEditable(false);
			oView.byId("ipBankAccountBC").setEditable(false);
			oView.byId("ipBankAccountBCCod").setEditable(false);
			oView.byId("taJust").setEditable(false);

			if (closeButtons === true) {
				// oView.byId("btnSanity").setEnabled(false);
				oView.byId("btnSave").setEnabled(false);
				oView.byId("btnAccept").setEnabled(false);
				oView.byId("btnCancel").setEnabled(false);
			}
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

			if (oCreate.IM_LOGGED_IN == 5) {
				oCreate.OBSERVATION = that.getView().byId("taJustSSG").getValue();
			}

			that.fFillCreateBankData(oCreate, that, req, newDt);

			//SUCESSO
			function fSuccess(oEvent) {
				oGlobalData.REQUISITION_ID = oEvent.EX_REQUISITION_ID;
				oGlobalData.IM_REQUISITION_ID = oEvent.EX_REQUISITION_ID;

				switch (action) {
				case "A":
					MessageBox.success("Requisição " + oEvent.EX_REQUISITION_ID + " aprovada com sucesso!");
					that.fUnableApprovalButtons(that);
					that.fUnableAllButtons(that);
					that.fVerifyAction(false, "A");
					// *** ANEXO ***
					break;

				case "D":
					MessageBox.success("Requisição " + oEvent.EX_REQUISITION_ID + " reprovada!");
					that.fUnableApprovalButtons(that);
					that.fVerifyAction(false, "D");
					// *** ANEXO ***
					break;

				case "S":
					that.fSucessMessageFromSendAction(oEvent);
					that.fVerifyAction(false, "S");

					// *** ANEXO ***
					that.saveAttachment(oGlobalData.IM_REQUISITION_ID, 'S');
					that.closeDmsDocument(oGlobalData.IM_REQUISITION_ID);
					break;

				case "C":
					MessageBox.success("Operação realizada com sucesso! As alterações realizadas foram canceladas");

					that.fGetBlock();
					var oUploadCollection = that.getView().byId("upldAttachments");
					oUploadCollection.destroyItems();
					that.fVerifyAction(false, "C");

					// *** ANEXO ***
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
					// *** ANEXO ***
					that.saveAttachment(oGlobalData.IM_REQUISITION_ID, 'G');
					break;
				}

				that.fGetLog();
			}

			//ERRO
			function fError(oEvent) {
				oGlobalData.REQUISITION_ID = that.fGetRequisitionId(oEvent);

				if ($(":contains(" + "/IWBEP/CX_SD_GEN_DPC_BUSINS" + ")", oEvent.response.body).length == 0) {
					var message = $(oEvent.response.body).find("message").first().text();

					if (message === undefined || message === "" || message === " ") {
						message = "Erro inesperado. Favor contactar o administrador do sistema";
					}

					MessageBox.error(message);

				} else {
					// Requisition ID
					var detailReq = $(":contains(99/999S:99:999)", oEvent.response.body);
					var formattedDetailReq = (detailReq[2].outerText.replace("99/999S:99:999 ", "").substr(0, 8));
					oGlobalData.IM_REQUISITION_ID = formattedDetailReq;

					var detail = $(":contains(" + "/IWBEP/CX_SD_GEN_DPC_BUSINS" + ")", oEvent.response.body);
					var formattedDetail = (detail[2].outerText.replace("/IWBEP/CX_SD_GEN_DPC_BUSINS", ""));

					formattedDetail = formattedDetail.replace("error", "");

					MessageBox.error(formattedDetail);

					that.fVerifyAction();

				}
			}

			var oModel = new sap.ui.model.odata.ODataModel("/sap/opu/odata/sap/ZODHR_SS_MAINTENANCE_CADASTRAL_SRV/");
			oModel.create("ET_BANK_DET", oCreate, null, fSuccess, fError);
		},

		// --------------------------------------------
		// fFillCreateBankData
		// --------------------------------------------		
		fFillCreateBankData: function (oCreate, that, req, newDt) {
			var oView = that.getView();
			var bankBC;
			var bankAgencyBC;
			var bankAccountBC;
			var bankAccountBCDigit;
			var bankAgencyBCDigit;
			var bankMB;
			var bankAgencyMB;
			var bankAccountMB = oView.getModel("ET_BANK_DET").oData.BANKN0; //Account;
			var bankAccountDigitMB = oView.byId("ipBankAccountMBDCod").getValue(); //Account Digit;
			var bankAgencyDigitMB = oView.byId("ipBankAgencyMBDCod").getValue(); //Agency Digit;
			oCreate.BLOCK.CHECKING_ACCOUNT = oView.byId("cbSalaryCount").getSelected();
			bankMB = oView.byId("slBankKeyMBD").getSelectedKey(); //Bank  
			bankAgencyMB = oView.byId("ipBankAgencyMBD").getValue(); //Agency

			oCreate.BLOCK.BANKA0 = oView.getModel("ET_BANK_DET").oData.BANKA0;
			oCreate.BLOCK.BANKL0 = oView.getModel("ET_BANK_DET").oData.BANKL0;
			oCreate.BLOCK.BKONT0 = oView.getModel("ET_BANK_DET").oData.BKONT0;
			oCreate.BLOCK.BANKN0 = oView.getModel("ET_BANK_DET").oData.BANKN0;

			// oCreate.BLOCK.BANKA0 = oView.byId("ipBankKeyMBD").getValue();
			// oCreate.BLOCK.BANKABR04 = oView.byId("ipBankKeyBC").getValue();

			// if(that.company == 'ELEK'){
			// 	oCreate.BLOCK.BANKL0 = bankMB + '0' + bankAgencyMB;
			// }else{
			// 	oCreate.BLOCK.BANKL0 = bankMB + bankAgencyMB;
			// }

			// switch (bankMB) {
			// case "2372": //Bradesco
			// 	oCreate.BLOCK.BANKN0 = bankAccountMB + "-" + bankAccountDigitMB;
			// 	oCreate.BLOCK.BKONT0 = bankAgencyDigitMB;
			// 	break;

			// case "3417": //Itaú
			// 	oCreate.BLOCK.BANKN0 = bankAccountMB;
			// 	oCreate.BLOCK.BKONT0 = bankAccountDigitMB;
			// 	break;

			// default: //Others
			// 	oCreate.BLOCK.BANKN0 = bankAccountMB;
			// 	oCreate.BLOCK.BKONT0 = bankAgencyDigitMB + bankAccountDigitMB;
			// 	break;
			// }

			bankBC = oView.byId("slBankKeyBC").getSelectedKey(); //Bank  
			bankAgencyBC = oView.byId("ipBankAgencyBC").getValue(); //Agency 
			bankAccountBC = oView.byId("ipBankAccountBC").getValue(); //Account
			bankAccountBCDigit = oView.byId("ipBankAccountBCCod").getValue(); //Account Digit  
			bankAgencyBCDigit = oView.byId("ipBankAgencyBCCod").getValue(); //Agency Digit				

			//			Limpar dados bancarios da conta de reembolso
			if (oCreate.IM_ACTION === "C") {
				oView.byId("ipBankAgencyBC").setValue("");
				oView.byId("ipBankAccountBC").setValue("");
				oView.byId("ipBankAccountBCCod").setValue("");
				oView.byId("ipBankAgencyBCCod").setValue("");
			}

			if (bankAgencyBC != undefined && bankAgencyBC != "" && bankAgencyBC != null) {

				if (that.company != "ELEK") {
					oCreate.BLOCK.BANKLBR04 = bankBC + "0" + bankAgencyBC;
				} else {
					oCreate.BLOCK.BANKLBR04 = bankBC + bankAgencyBC;
				}
				oCreate.BLOCK.BANKNBR04 = bankAccountBC;

			}
			if (that.company == "ELEK") {

				if (bankAgencyBCDigit == "") {
					oCreate.BLOCK.BKONTBR04 = " " + bankAccountBCDigit;
				} else {
					oCreate.BLOCK.BKONTBR04 = bankAgencyBCDigit + bankAccountBCDigit;
				}
			}else{
				oCreate.BLOCK.BKONTBR04 = bankAgencyBCDigit; //TGE388990
			}

			oCreate.BLOCK.TYPE_SAVE = req;

			if (newDt !== "" && newDt !== undefined) {
				oCreate.BLOCK.SSG_DATE = newDt;
			} else {
				oCreate.BLOCK.SSG_DATE = null;
			}

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
		// onSend
		// --------------------------------------------  
		onSend: function () {
			var that = this;
			var oBundle = this.getView().getModel("i18n").getResourceBundle();
			var message = oBundle.getText("termo_responsabilidade");
			var attachment = this.fValidAttachment();

			if (!attachment) {
				this.handleErrorMessageBank();
			} else if (this.fValidInputFields() === false && attachment === true) {
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
			} else {
				this.handleErrorMessageBoxPress();
			}

		},

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
		// onCancel
		// -------------------------------------------- 		
		onCancel: function () {
			var oGlobalData = this.getView().getModel("ET_GLOBAL_DATA");
			var observationSSG = this.getView().byId("taJustSSG").getValue();

			if (oGlobalData.IM_LOGGED_IN == 5 && (observationSSG == "" || observationSSG == undefined || observationSSG == null)) {
				this.handleErrorMessageBoxDisapprove();
			} else {
				this.fActions(this, "Cancelamento", "C");
			}
		},

		// --------------------------------------------
		// onReject
		// --------------------------------------------  
		onReject: function () {
			var oGlobalData = this.getView().getModel("ET_GLOBAL_DATA");
			var observationSSG = this.getView().byId("taJustSSG").getValue();

			if (oGlobalData.IM_LOGGED_IN == 5 && (observationSSG == "" || observationSSG == undefined || observationSSG == null)) {
				this.handleErrorMessageBoxDisapprove();
			} else {
				this.fActions(this, "Rejeição", "D");
			}

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
		// onPressCopy
		// -------------------------------------------- 		
		onPressCopy: function () {
			var oView = this.getView();

			oView.byId("slBankKeyBC").setSelectedKey(oView.byId("slBankKeyMBD").getSelectedKey());
			oView.byId("ipBankAgencyBC").setValue(oView.byId("ipBankAgencyMBD").getValue());
			oView.byId("ipBankAgencyBCCod").setValue(oView.byId("ipBankAgencyMBDCod").getValue());
			oView.byId("ipBankAccountBC").setValue(oView.byId("ipBankAccountMBD").getValue());
			oView.byId("ipBankAccountBCCod").setValue(oView.byId("ipBankAccountMBDCod").getValue());

			this.fMessage("None", null, "slBankKeyBC");
			this.fMessage("None", null, "ipBankAgencyBC");
			this.fMessage("None", null, "ipBankAgencyBCCod");
			this.fMessage("None", null, "ipBankAccountBC");
			this.fMessage("None", null, "ipBankAccountBCCod");

		},
		fValidaCompany: function () {
			var that = this;
			var oModel = new sap.ui.model.odata.ODataModel("/sap/opu/odata/SAP/ZODHR_SS_MAINTENANCE_CADASTRAL_SRV/");
			oModel.read("/et_companySet", {
				async: false,
				success: function (oData, oResponse) {
					that.company = oData.results[0].company;

					// if(company === 'ELEK'){
					// } else{
					// }
				},
				error: function (e) {}
			});
		},
		showDialogAnexo: function () {
			
			//TGE388990, solicitar apenas 1 anexo
			var chData = this.changedData[0];
			
			this.changedData = []; 
			this.changedData.push(chData);
			
			var sDialogName = 'Anexo';
			this.mDialogs = this.mDialogs || {};
			var oDialog = this.mDialogs[sDialogName];

			if (!oDialog) {
				oDialog = new Anexo(this.getView()); //Justificar ausencia

				this.mDialogs[sDialogName] = oDialog;

				// For navigation.
				oDialog.setRouter(this.oRouter);
			}

			oDialog.open(this.changedData, "101");
			//this.changedData = [];
		},

		saveAttachment: function (reqNumber, status) {
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
		getAttachment: function () {

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