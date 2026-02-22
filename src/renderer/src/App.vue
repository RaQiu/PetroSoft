<template>
  <div class="app-container">
    <TitleBar />
    <template v-if="workareaStore.isOpen">
      <MenuBar />
      <ToolBar />
      <MainContent />
      <StatusBar />
    </template>
    <template v-else>
      <WelcomeView @create="onCreateWorkarea" @open="onOpenWorkarea" />
    </template>

    <!-- Dialogs (always mounted so they can be triggered) -->
    <CreateWorkareaDialog />
    <ImportFileDialog />
    <ExportFileDialog />
    <DataManageDialog />
    <WellListDialog />
    <WellCurveWindow />
    <AboutDialog />
    <HistogramDialog />
    <CrossplotDialog />
    <WellDataQueryDialog />
    <ResampleDialog />
    <FilterDialog />
    <CurveCalculatorDialog />
    <StandardizeDialog />
    <SegyBrowseDialog />
    <SeismicImportDialog />
    <SeismicDisplayDialog />
    <BasemapDialog />
    <OutlierDialog />
    <BaselineDialog />
    <ReservoirParamsDialog />
    <VshCalcDialog />
    <PorosityCalcDialog />
    <TotalPorosityDialog />
    <SWavePredictDialog />
    <ElasticCalcDialog />
    <FluidSubDialog />
    <VpCorrectionDialog />
    <DensityCorrectionDialog />
    <CurveReconstructDialog />
    <AdaptiveModelDialog />
    <SandShaleModelDialog />
    <ElasticImpedanceDialog />
    <FluidSubSimplifiedDialog />
    <QuickCalibrationDialog />
    <VelocityModelingDialog />
    <VelocityConversionDialog />
    <TDConvertVolumeDialog />
    <TDConvertHorizonDialog />
    <TDConvertFaultDialog />
    <HorizonFromTopsDialog />
    <HorizonSmoothDialog />
    <HorizonCalcDialog />
    <HorizonInterpolateDialog />
    <HorizonMergeDialog />
    <HorizonDecimateDialog />
  </div>
</template>

<script setup lang="ts">
import { useWorkareaStore } from '@/stores/workarea'
import { useDialogStore } from '@/stores/dialog'
import TitleBar from '@/components/layout/TitleBar.vue'
import MenuBar from '@/components/layout/MenuBar.vue'
import ToolBar from '@/components/layout/ToolBar.vue'
import MainContent from '@/components/layout/MainContent.vue'
import StatusBar from '@/components/layout/StatusBar.vue'
import WelcomeView from '@/views/WelcomeView.vue'
import CreateWorkareaDialog from '@/components/dialogs/CreateWorkareaDialog.vue'
import ImportFileDialog from '@/components/dialogs/ImportFileDialog.vue'
import ExportFileDialog from '@/components/dialogs/ExportFileDialog.vue'
import DataManageDialog from '@/components/dialogs/DataManageDialog.vue'
import WellListDialog from '@/components/dialogs/WellListDialog.vue'
import WellCurveWindow from '@/components/dialogs/WellCurveWindow.vue'
import AboutDialog from '@/components/dialogs/AboutDialog.vue'
import HistogramDialog from '@/components/dialogs/HistogramDialog.vue'
import CrossplotDialog from '@/components/dialogs/CrossplotDialog.vue'
import WellDataQueryDialog from '@/components/dialogs/WellDataQueryDialog.vue'
import ResampleDialog from '@/components/dialogs/ResampleDialog.vue'
import FilterDialog from '@/components/dialogs/FilterDialog.vue'
import CurveCalculatorDialog from '@/components/dialogs/CurveCalculatorDialog.vue'
import StandardizeDialog from '@/components/dialogs/StandardizeDialog.vue'
import SegyBrowseDialog from '@/components/dialogs/SegyBrowseDialog.vue'
import SeismicImportDialog from '@/components/dialogs/SeismicImportDialog.vue'
import SeismicDisplayDialog from '@/components/dialogs/SeismicDisplayDialog.vue'
import BasemapDialog from '@/components/dialogs/BasemapDialog.vue'
import OutlierDialog from '@/components/dialogs/OutlierDialog.vue'
import BaselineDialog from '@/components/dialogs/BaselineDialog.vue'
import ReservoirParamsDialog from '@/components/dialogs/ReservoirParamsDialog.vue'
import VshCalcDialog from '@/components/dialogs/VshCalcDialog.vue'
import PorosityCalcDialog from '@/components/dialogs/PorosityCalcDialog.vue'
import TotalPorosityDialog from '@/components/dialogs/TotalPorosityDialog.vue'
import SWavePredictDialog from '@/components/dialogs/SWavePredictDialog.vue'
import ElasticCalcDialog from '@/components/dialogs/ElasticCalcDialog.vue'
import FluidSubDialog from '@/components/dialogs/FluidSubDialog.vue'
import VpCorrectionDialog from '@/components/dialogs/VpCorrectionDialog.vue'
import DensityCorrectionDialog from '@/components/dialogs/DensityCorrectionDialog.vue'
import CurveReconstructDialog from '@/components/dialogs/CurveReconstructDialog.vue'
import AdaptiveModelDialog from '@/components/dialogs/AdaptiveModelDialog.vue'
import SandShaleModelDialog from '@/components/dialogs/SandShaleModelDialog.vue'
import ElasticImpedanceDialog from '@/components/dialogs/ElasticImpedanceDialog.vue'
import FluidSubSimplifiedDialog from '@/components/dialogs/FluidSubSimplifiedDialog.vue'
import QuickCalibrationDialog from '@/components/dialogs/QuickCalibrationDialog.vue'
import VelocityModelingDialog from '@/components/dialogs/VelocityModelingDialog.vue'
import VelocityConversionDialog from '@/components/dialogs/VelocityConversionDialog.vue'
import TDConvertVolumeDialog from '@/components/dialogs/TDConvertVolumeDialog.vue'
import TDConvertHorizonDialog from '@/components/dialogs/TDConvertHorizonDialog.vue'
import TDConvertFaultDialog from '@/components/dialogs/TDConvertFaultDialog.vue'
import HorizonFromTopsDialog from '@/components/dialogs/HorizonFromTopsDialog.vue'
import HorizonSmoothDialog from '@/components/dialogs/HorizonSmoothDialog.vue'
import HorizonCalcDialog from '@/components/dialogs/HorizonCalcDialog.vue'
import HorizonInterpolateDialog from '@/components/dialogs/HorizonInterpolateDialog.vue'
import HorizonMergeDialog from '@/components/dialogs/HorizonMergeDialog.vue'
import HorizonDecimateDialog from '@/components/dialogs/HorizonDecimateDialog.vue'

const workareaStore = useWorkareaStore()
const dialogStore = useDialogStore()

function onCreateWorkarea() {
  dialogStore.showCreateWorkarea()
}

function onOpenWorkarea() {
  workareaStore.openWorkareaFromDisk()
}
</script>

<style scoped lang="scss">
.app-container {
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}
</style>
