sap.ui.core.mvc.Controller.extend("autoServico.view.Master", {

	onInit: function () {
		this.oInitialLoadFinishedDeferred = jQuery.Deferred();

		var oEventBus = this.getEventBus();

		this.getView().byId("master1List").attachEventOnce("updateFinished", function () {
			this.oInitialLoadFinishedDeferred.resolve();
			oEventBus.publish("Master", "InitialLoadFinished", {
				oListItem: this.getView().byId("master1List").getItems()[0]
			});
			this.getRouter().detachRoutePatternMatched(this.onRouteMatched, this);
		}, this);

		this.fSetHeader();

		// //On phone devices, there is nothing to select from the list. There is no need to attach events.
		if (sap.ui.Device.system.phone) {
			return;
		}

		this.getRouter().attachRoutePatternMatched(this.onRouteMatched, this);
		oEventBus.subscribe("Master2", "NotFound", this.onNotFound, this);
		sap.ui.getCore().getConfiguration().setLanguage("pt-BR");
		
	},
	//  --------------------------------------------
	//  fSetHeader
	//  --------------------------------------------
	fSetHeader: function () {
		var oModel = new sap.ui.model.odata.ODataModel("/sap/opu/odata/SAP/ZODHR_SS_MAINTENANCE_CADASTRAL_SRV/");
		var urlParam;
		var that = this;

		var oStartupParameters = jQuery.sap.getUriParameters().mParams;
		var sReq = '',
			sPernr = '',
			sProfile = '',
			sBukrs = '';

		function fSuccessExecutar(oEvent) {
			debugger;
			var oValue = new sap.ui.model.json.JSONModel(oEvent.results[0].EX_EMPLOYEE_HEADER);
			oValue.oData.PERNR = oEvent.results[0].IM_PERNR;
			sap.ui.getCore().setModel(oValue, "ET_HEADER");

			var oValue2 = new sap.ui.model.json.JSONModel(oEvent.results[0].INIT_TO_BLOCK);
			sap.ui.getCore().setModel(oValue2, "ET_VALID_BLOCK");

			for (var i = 0; i < oValue2.oData.results.length; i++) {

				if (sProfile === "EM") {
					if (oValue2.oData.results[i].BLOCK_TYPE !== '107' &&
						oValue2.oData.results[i].BLOCK_TYPE !== '108' &&
						oValue2.oData.results[i].BLOCK_TYPE !== '109' &&
						oValue2.oData.results[i].BLOCK_TYPE !== '110' &&
						oValue2.oData.results[i].BLOCK_TYPE !== '111' &&
						oValue2.oData.results[i].BLOCK_TYPE !== '112' &&
						oValue2.oData.results[i].BLOCK_TYPE !== '113' &&
						oValue2.oData.results[i].BLOCK_TYPE !== '114' &&
						oValue2.oData.results[i].BLOCK_TYPE !== '115' &&
						oValue2.oData.results[i].BLOCK_TYPE !== '116' &&
						oValue2.oData.results[i].BLOCK_TYPE !== '117' &&
						oValue2.oData.results[i].BLOCK_TYPE !== '118' &&
						oValue2.oData.results[i].BLOCK_TYPE !== '119' &&
						oValue2.oData.results[i].BLOCK_TYPE !== '120' &&
						oValue2.oData.results[i].BLOCK_TYPE !== '121' &&
						oValue2.oData.results[i].BLOCK_TYPE !== '122' &&
						oValue2.oData.results[i].BLOCK_TYPE !== '123' &&
						oValue2.oData.results[i].BLOCK_TYPE !== '124' &&
						oValue2.oData.results[i].BLOCK_TYPE !== '125' &&
						oValue2.oData.results[i].BLOCK_TYPE !== '126' &&
						oValue2.oData.results[i].BLOCK_TYPE !== '127' &&
						oValue2.oData.results[i].BLOCK_TYPE !== '128') {

						that.fSetBlock(oValue2.oData.results[i].BLOCK_TYPE);
					}
				}
				if (sProfile === "RH" || sProfile === "ADM") {
					that.fSetBlock(oValue2.oData.results[i].BLOCK_TYPE);
				}
				if ((sProfile === "SSMA") && (oValue2.oData.results[i].BLOCK_TYPE === "110" || oValue2.oData.results[i].BLOCK_TYPE === "107")) {
					that.fSetBlock(oValue2.oData.results[i].BLOCK_TYPE);
				}

				// 101  Dados bancários
				// 102  Dados pessoais
				// 103  Dependentes
				// 104  Documentos
				// 105  Endereços e telefones
				// 106  Formação educacional
				// 107  Ausências
				// 108  Sindicatos
				// 109  Benefícios
				// 110  Deficiência
				// 111  Aposentadoria
				// 112  Estabilidade
				// 113  Vale transporte
				// 114  Plano Saúde/Odonto Titular
				// 115  Seguro de Vida
				// 116  Vale Refeição
				// 117  Auxílio Aluguel
				// 118  Associação Esportiva
				// 119  Transporte Fretado
				// 120  Cooperativa
				// 121  Contribuição Sindical

			}
		}

		function fErrorExecutar(oEvent) {
			console.log("An error occured while reading ET_INIT_MASTER!");
		}

		if (oStartupParameters.IM_REQUISITION_ID) {
			sReq = oStartupParameters.IM_REQUISITION_ID[0];
		}

		if (oStartupParameters.IM_PERNR) {
			sPernr = oStartupParameters.IM_PERNR[0];
		}

		if (oStartupParameters.IM_PROFILE) {
			sProfile = oStartupParameters.IM_PROFILE[0];
		}

		if (oStartupParameters.IM_BUKRS) {
			sBukrs = oStartupParameters.IM_BUKRS[0];
		}

		urlParam = "$expand=INIT_TO_BLOCK";

		oModel.read("ET_INIT_MASTER?$filter=IM_PERNR eq'" + sPernr + "' and IM_REQUISITION_ID eq'" + sReq + "' and IM_BUKRS eq'" + sBukrs + "' ", null, urlParam, false,
			fSuccessExecutar, fErrorExecutar);
	},

	//  --------------------------------------------
	//  fSetBlock
	//  --------------------------------------------
	fSetBlock: function (blockName) {

		var oListItem = this.getView().byId(blockName);
		oListItem.setVisible(true);

	},

	onRouteMatched: function (oEvent) {
		var sName = oEvent.getParameter("name");

		if (sName !== "main") {
			return;
		}

		var oStartupParameters = jQuery.sap.getUriParameters().mParams;
		var sReq = '';

		var sDetail = "autoServico.view.Welcome";
		
		if (oStartupParameters.IM_REQUISITION_ID) {
			sReq = oStartupParameters.IM_REQUISITION_ID[0];
		}else{
			sDetail = "autoServico.view.DetailPersonalData";
		}


		if (sReq) {

			var oValidBlock = sap.ui.getCore().getModel("ET_VALID_BLOCK");

			switch (oValidBlock.oData.results[0].BLOCK_TYPE) {
			case "101":
				sDetail = "autoServico.view.DetailBankData";
				break;
			case "102":
				sDetail = "autoServico.view.DetailPersonalData";
				break;
			case "103":
				sDetail = "autoServico.view.DetailDependents";
				break;
			case "104":
				sDetail = "autoServico.view.DetailDocuments";
				break;
			case "105":
				sDetail = "autoServico.view.DetailAddress";
				break;
			case "106":
				sDetail = "autoServico.view.DetailEducation";
				break;
			case "107":
				sDetail = "autoServico.view.DetailAbsences";
				break;
			case "108":
				sDetail = "autoServico.view.DetailUnions";
				break;
			case "109":
				sDetail = "autoServico.view.DetailBenefits";
				break;
			case "110":
				sDetail = "autoServico.view.DetailDeficiency";
				break;
			case "111":
				sDetail = "autoServico.view.DetailRetirement";
				break;
			case "112":
				sDetail = "autoServico.view.DetailStability";
				break;
			case "113":
				sDetail = "autoServico.view.DetailTranspVoucher";
				break;
			case "114":
				sDetail = "autoServico.view.DetailHealth";
				break;
			case "115":
				sDetail = "autoServico.view.DetailLifeInsurance";
				break;
			case "116":
				sDetail = "autoServico.view.DetailMealAllowance";
				break;
			case "117":
				sDetail = "autoServico.view.DetailRentalAllowance";
				break;
			case "118":
				sDetail = "autoServico.view.DetailSportAssociation";
				break;
			case "119":
				sDetail = "autoServico.view.DetailShuttle";
				break;
			case "120":
				sDetail = "autoServico.view.DetailCooperative";
				break;
			case "121":
				sDetail = "autoServico.view.DetailUnionsEmployee";
				break;
			}

		}
		this.getRouter().myNavToWithoutHash({
			currentView: this.getView(),
			targetViewName: sDetail,
			targetViewType: "XML"
		});
	},

	waitForInitialListLoading: function (fnToExecute) {
		jQuery.when(this.oInitialLoadFinishedDeferred).then(jQuery.proxy(fnToExecute, this));
	},

	onNotFound: function () {
		this.getView().byId("master1List").removeSelections();
	},

	//  --------------------------------------------
	//  fSetMockData
	//  --------------------------------------------
	fSetMockData: function (that, mockPath) {
		//Create contens (on test purpose) and bind it to table
		var oTable = that.getView().byId("tRequisition");
		var oRowModel = new sap.ui.model.json.JSONModel("model/mockRequisitionTableManager.json");

		oTable.setModel(oRowModel);
		oTable.bindRows(mockPath);
	},

	onSearch: function () {
		// Add search filter
		var filters = [];
		var searchString = this.getView().byId("master1SearchField").getValue();
		if (searchString && searchString.length > 0) {
			filters = [new sap.ui.model.Filter("", sap.ui.model.FilterOperator.Contains, searchString)];
		}

		// Update list binding
		this.getView().byId("master1List").getBinding("items").filter(filters);
	},

	onSelect: function (oEvent) {
		// Get the list item either from the listItem parameter or from the event's
		// source itself (will depend on the device-dependent mode)
		oEvent.getParameter("listItem").firePress();
	},

	showDetail: function (oItem, view) {
		this.getRouter().myNavToWithoutHash({
			currentView: this.getView(),
			targetViewName: "autoServico.view." + view,
			targetViewType: "XML",
			transition: "slide"
		});

	},

	//  --------------------------------------------------------------------------
	//                onPress Event
	//  Get the list item either from the listItem parameter or from the event's
	//  source itself (will depend on the device-dependent mode)
	//  --------------------------------------------------------------------------

	onPressEducation: function (oEvent) {
		this.showDetail(oEvent.getParameter("listItem") || oEvent.getSource(), "DetailEducation");
	},

	onPressAddress: function (oEvent) {
		this.showDetail(oEvent.getParameter("listItem") || oEvent.getSource(), "DetailAddress");
	},

	onPressDocuments: function (oEvent) {
		this.showDetail(oEvent.getParameter("listItem") || oEvent.getSource(), "DetailDocuments");
	},

	onPressDependent: function (oEvent) {
		this.showDetail(oEvent.getParameter("listItem") || oEvent.getSource(), "DetailDependents");
	},

	onPressPersData: function (oEvent) {
		this.showDetail(oEvent.getParameter("listItem") || oEvent.getSource(), "DetailPersonalData");
	},

	onPressBankData: function (oEvent) {
		this.showDetail(oEvent.getParameter("listItem") || oEvent.getSource(), "DetailBankData");
	},

	getEventBus: function () {
		return sap.ui.getCore().getEventBus();
	},

	getRouter: function () {
		return sap.ui.core.UIComponent.getRouterFor(this);
	},

	onExit: function (oEvent) {
		this.getEventBus().unsubscribe("Master2", "NotFound", this.onNotFound, this);
	}
});