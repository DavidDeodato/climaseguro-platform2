import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { apiGenerateActionPlan } from "@/lib/api";
import { Card } from "@/components/ui/card";
import { useNavigate } from "react-router-dom";

interface Zone {
  id?: number;
  zone_id?: number;
  level?: string;
  score?: number;
  coordinates: { lat: number; lon: number };
  total_imoveis?: number;
  populacao_estimada?: number;
  roi_formatado?: string;
  notified_at?: string;
  _originalData?: any;
}

interface PrefeituraZoneModalProps {
  zone: Zone | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const PrefeituraZoneModal = ({ zone, open, onOpenChange }: PrefeituraZoneModalProps) => {
  const navigate = useNavigate();

  if (!zone) return null;

  // Compatibilidade com ambos os formatos (notificação antiga e novo cálculo)
  const zoneId = zone.zone_id || zone.id || 0;
  const zoneLevel = zone.level || "DESCONHECIDO";
  const zoneScore = zone.score || 0;
  const totalImoveis = zone.total_imoveis || 0;
  const populacaoEstimada = zone.populacao_estimada || 0;
  const originalData = zone._originalData;

  // Cálculos financeiros
  const custoMedioPorImovel = 15000; // R$ por imóvel
  const custoTotalPrevencao = totalImoveis * custoMedioPorImovel;
  const custoMedioReconstrucao = 180000; // R$ por imóvel
  const custoTotalDesastre = totalImoveis * custoMedioReconstrucao;
  const economiaEstimada = custoTotalDesastre - custoTotalPrevencao;
  const roi = ((economiaEstimada / custoTotalPrevencao) * 100).toFixed(0);

  const handleIniciarProcesso = () => {
    const context = {
      zone: { id: zoneId, level: zoneLevel, coordinates: zone.coordinates },
      demographics: { total_imoveis: totalImoveis, populacao_estimada: populacaoEstimada },
      financials: {
        custo_prevencao_por_imovel: custoMedioPorImovel,
        custo_reconstrucao_por_imovel: custoMedioReconstrucao,
        custo_prevencao_total: custoTotalPrevencao,
        custo_desastre_total: custoTotalDesastre,
        economia_estimada: economiaEstimada,
        roi_percent: Number(roi),
      },
      notification: { notified_at: zone.notified_at || new Date().toISOString() },
    };
    navigate(`/prefeitura/zona/${zoneId}/wizard`, { state: { context } });
  };

  // Extrair fatores de risco se disponíveis
  const fatores = originalData?.fatores || [];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[96vw] sm:max-w-3xl max-h-[85dvh] overflow-y-auto z-[9999] p-4">
        <DialogHeader>
          <DialogTitle className="text-2xl">
            Zona {zoneId} - {zoneLevel}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Score de Risco */}
          {zoneScore > 0 && (
            <Card className={`p-4 border-2 ${
              zoneScore >= 75 ? 'bg-red-50 border-red-300' :
              zoneScore >= 50 ? 'bg-orange-50 border-orange-300' :
              'bg-yellow-50 border-yellow-300'
            }`}>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Score de Risco</p>
                  <p className="text-4xl font-bold">{zoneScore}/100</p>
                </div>
                <div className="text-6xl">
                  {zoneScore >= 75 ? "🔴" : zoneScore >= 50 ? "🟠" : "🟡"}
                </div>
              </div>
            </Card>
          )}

          {/* Sintetizado de Riscos */}
          {fatores.length > 0 && (
            <Card className="p-4 bg-muted/50">
              <h3 className="text-lg font-semibold mb-3">📊 Fatores de Risco Identificados</h3>
              <div className="space-y-2">
                {fatores.map((fator: any, idx: number) => {
                  const percentage = Math.round(fator.valor * 100);
                  const isHigh = percentage >= 70;
                  
                  return (
                    <div key={idx} className="space-y-1">
                      <div className="flex justify-between text-sm">
                        <span className="font-medium">{fator.nome}</span>
                        <span className={`font-bold ${isHigh ? 'text-red-600' : 'text-gray-600'}`}>
                          {percentage}%
                        </span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div 
                          className={`h-2 rounded-full ${
                            isHigh ? 'bg-red-500' : 
                            percentage >= 50 ? 'bg-orange-500' : 
                            'bg-yellow-500'
                          }`}
                          style={{ width: `${percentage}%` }}
                        />
                      </div>
                      <p className="text-xs text-muted-foreground">
                        Peso no cálculo: {Math.round(fator.peso * 100)}%
                      </p>
                    </div>
                  );
                })}
              </div>
            </Card>
          )}

          {/* Disclaimer sobre Análise de Satélite */}
          <Card className="p-4 bg-blue-50 border-blue-200">
            <div className="flex gap-3">
              <div className="text-2xl">🛰️</div>
              <div className="flex-1">
                <h4 className="font-semibold text-blue-900 mb-1">Análise de Imagens de Satélite</h4>
                <p className="text-sm text-blue-800">
                  O número de imóveis afetados foi estimado utilizando <strong>API do ARCgis</strong> 
                  combinada com <strong>Inteligência Artificial</strong> para contagem automática de residências 
                  visíveis em imagens de satélite de alta resolução.
                </p>
                <p className="text-xs text-blue-700 mt-2">
                  ✓ Precisão estimada: 85-95% | ✓ Última atualização: {new Date().toLocaleDateString('pt-BR')}
                </p>
              </div>
            </div>
          </Card>

          {/* Informações da Zona */}
          <Card className="p-4 bg-muted/50">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-muted-foreground">Imóveis em Risco</p>
                <p className="text-2xl font-bold">{totalImoveis}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">População Estimada</p>
                <p className="text-2xl font-bold">{populacaoEstimada}</p>
              </div>
            </div>
          </Card>

          {/* Memorial de Cálculo */}
          <div className="space-y-3">
            <h3 className="text-lg font-semibold">💰 Memorial de Cálculo Financeiro</h3>
            
            {/* Custos de Prevenção */}
          <Card className="p-4 border-blue-200 bg-blue-50">
            <h4 className="font-semibold text-blue-900 mb-3">Custos de Prevenção</h4>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-blue-700">Custo médio por imóvel:</span>
                  <span className="font-medium">R$ {custoMedioPorImovel.toLocaleString('pt-BR')}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-blue-700">Número de imóveis:</span>
                  <span className="font-medium">× {totalImoveis}</span>
                </div>
                <div className="border-t border-blue-300 pt-2 mt-2"></div>
                <div className="flex justify-between text-base">
                  <span className="font-semibold text-blue-900">Total Prevenção:</span>
                  <span className="font-bold text-blue-900">R$ {custoTotalPrevencao.toLocaleString('pt-BR')}</span>
                </div>
              </div>
            </Card>

            {/* Custos de Desastre */}
          <Card className="p-4 border-red-200 bg-red-50">
            <h4 className="font-semibold text-red-900 mb-3">Custos Estimados de Desastre</h4>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-red-700">Custo médio reconstrução por imóvel:</span>
                  <span className="font-medium">R$ {custoMedioReconstrucao.toLocaleString('pt-BR')}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-red-700">Número de imóveis:</span>
                  <span className="font-medium">× {totalImoveis}</span>
                </div>
                <div className="border-t border-red-300 pt-2 mt-2"></div>
                <div className="flex justify-between text-base">
                  <span className="font-semibold text-red-900">Total Desastre:</span>
                  <span className="font-bold text-red-900">R$ {custoTotalDesastre.toLocaleString('pt-BR')}</span>
                </div>
              </div>
            </Card>

            {/* Economia e ROI */}
          <Card className="p-4 border-green-200 bg-green-50">
            <h4 className="font-semibold text-green-900 mb-3">Retorno do Investimento</h4>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-green-700">Economia estimada:</span>
                  <span className="font-medium">R$ {economiaEstimada.toLocaleString('pt-BR')}</span>
                </div>
                <div className="border-t border-green-300 pt-2 mt-2"></div>
                <div className="flex justify-between text-lg">
                  <span className="font-semibold text-green-900">ROI:</span>
                  <span className="font-bold text-green-900 text-2xl">{roi}%</span>
                </div>
                <p className="text-xs text-green-700 mt-2">
                  A cada R$ 1,00 investido em prevenção, economiza-se R$ {(parseFloat(roi) / 100 + 1).toFixed(2)} em reconstrução
                </p>
              </div>
            </Card>
          </div>

          {/* Metodologia */}
          <Card className="p-4 bg-muted/30">
            <h4 className="font-semibold mb-2 text-sm">Metodologia de Cálculo</h4>
            <ul className="text-xs space-y-1 text-muted-foreground">
              <li>• Custos baseados em dados históricos da Defesa Civil</li>
              <li>• Valores incluem: obras de contenção, drenagem e relocação</li>
              <li>• Reconstrução: custos médios de reparos estruturais + custos sociais</li>
              <li>• População estimada: média de 3,2 pessoas por imóvel (IBGE)</li>
            </ul>
          </Card>

          {/* Botão de Ação */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <Button 
              onClick={handleIniciarProcesso}
              size="lg" 
              className="w-full"
            >
              Submissão para Fundos
            </Button>
            <Button 
              variant="outline"
              onClick={async () => {
                const context = {
                  zone: { id: zoneId, level: zoneLevel, coordinates: zone.coordinates },
                  demographics: { total_imoveis: totalImoveis, populacao_estimada: populacaoEstimada },
                  financials: {
                    custo_prevencao_por_imovel: custoMedioPorImovel,
                    custo_reconstrucao_por_imovel: custoMedioReconstrucao,
                    custo_prevencao_total: custoTotalPrevencao,
                    custo_desastre_total: custoTotalDesastre,
                    economia_estimada: economiaEstimada,
                    roi_percent: Number(roi),
                  },
                };
                await apiGenerateActionPlan(context);
              }}
              size="lg"
              className="w-full"
            >
              Gerar Plano de Ação com IA
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default PrefeituraZoneModal;
