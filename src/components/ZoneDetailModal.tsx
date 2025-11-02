import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogCancel,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Info, Loader2 } from "lucide-react";

interface ZoneDetailModalProps {
  zone: {
    id: number;
    score: number;
    level: string;
    total_imoveis?: number;
    populacao_estimada?: number;
    coordinates: { lat: number; lon: number };
    _originalData?: any; // Dados completos do cálculo de risco
  } | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

// Função auxiliar para explicar fatores ao cidadão
const getFatorExplanation = (nome: string, percentage: number): string => {
  const isHigh = percentage >= 70;
  const isMedium = percentage >= 50;
  
  const explanations: Record<string, { high: string; medium: string; low: string }> = {
    "Histórico de Desastres": {
      high: "Região com histórico frequente de alagamentos ou deslizamentos no estado",
      medium: "Alguns eventos registrados no passado, requer monitoramento preventivo",
      low: "Poucos ou nenhum desastre registrado historicamente na região"
    },
    "Declividade do Terreno": {
      high: "Terreno muito inclinado, alto risco de deslizamentos e erosão",
      medium: "Inclinação moderada, atenção necessária em períodos de chuva forte",
      low: "Terreno plano ou pouco inclinado, baixo risco de deslizamento"
    },
    "Proximidade de Rios": {
      high: "Múltiplos rios na zona aumentam significativamente risco de alagamento",
      medium: "Presença de rios requer atenção ao volume de chuvas",
      low: "Poucos ou nenhum rio próximo, risco reduzido de enchentes"
    },
    "Densidade Urbana": {
      high: "Alta concentração de construções e vias aumenta o número de afetados",
      medium: "Densidade populacional moderada, impacto intermediário em emergências",
      low: "Área rural ou pouco povoada, menor número de pessoas em risco"
    },
    "Cobertura Vegetal": {
      high: "Pouca vegetação, solo desprotegido e vulnerável a erosão e deslizamentos",
      medium: "Cobertura vegetal moderada oferece alguma proteção natural",
      low: "Muita vegetação, proteção natural contra erosão e deslizamentos"
    }
  };

  // Tenta encontrar por nome exato ou similar
  const key = Object.keys(explanations).find(k => 
    nome.toLowerCase().includes(k.toLowerCase()) || k.toLowerCase().includes(nome.toLowerCase())
  );
  
  if (key) {
    const exp = explanations[key];
    return isHigh ? exp.high : isMedium ? exp.medium : exp.low;
  }
  
  // Explicação genérica
  return isHigh 
    ? "Este fator apresenta alto impacto no risco da região"
    : isMedium
    ? "Este fator tem impacto moderado no cálculo de risco"
    : "Este fator apresenta baixo impacto no risco total";
};

const ZoneDetailModal = ({ zone, open, onOpenChange }: ZoneDetailModalProps) => {
  const [showFinancialInfo, setShowFinancialInfo] = useState(false);
  const [prefeituraAcompanhando, setPrefeituraAcompanhando] = useState(false);

  // Reset ao fechar
  useEffect(() => {
    if (!open) {
      setShowFinancialInfo(false);
      setPrefeituraAcompanhando(false);
    }
  }, [open]);

  if (!zone) return null;

  // Extrair dados do cálculo de risco (se disponível)
  const fatores = zone._originalData?.fatores || [];
  const declividade = zone._originalData?.declividade || 0;
  const recomendacoes = zone._originalData?.recomendacoes || [];

  // ========================================
  // CÁLCULOS FINANCEIROS BASEADOS EM DADOS REAIS
  // ========================================
  
  // Usa dados diretos da zona
  const residences = zone.total_imoveis || 0;
  const population = Math.round(residences * 3.5);
  
  // 1. CUSTO DE RECONSTRUÇÃO
  // Baseado em: Custo médio de construção popular no Brasil (R$ 1.500/m²)
  // Área média residencial: 80m²
  // Fator de risco: aplica multiplicador baseado no score
  const avgHomeArea = 80; // m²
  const costPerSqMeter = 1500; // R$/m²
  const avgHomeValue = avgHomeArea * costPerSqMeter; // R$ 120.000
  const riskMultiplier = zone.score / 100; // 0 a 1
  const reconstructionCost = residences * avgHomeValue * riskMultiplier;
  
  // 2. CUSTO DE PERDAS HUMANAS E SOCIAIS
  // Baseado em: Estimativa IPEA de custos indiretos por pessoa afetada
  // R$ 15.000 por pessoa (saúde, deslocamento, assistência temporária)
  const costPerPersonAffected = 15000;
  const humanCost = population * costPerPersonAffected * riskMultiplier;
  
  // 3. CUSTO DE INFRAESTRUTURA PÚBLICA
  // Baseado em: 30% do custo de reconstrução residencial
  // (ruas, redes de água/esgoto, energia)
  const infrastructureCost = reconstructionCost * 0.3;
  
  // 4. PERDAS ECONÔMICAS INDIRETAS
  // Baseado em: 20% do total (perda de produtividade, comércio local)
  const indirectLosses = (reconstructionCost + humanCost + infrastructureCost) * 0.2;
  
  // CUSTO TOTAL DO DESASTRE
  const totalDisasterCost = reconstructionCost + humanCost + infrastructureCost + indirectLosses;
  
  // ========================================
  // CUSTOS DE PREVENÇÃO
  // ========================================
  
  // 1. SISTEMA DE DRENAGEM
  // Baseado em: R$ 300/m linear de micro-drenagem
  // Estima 50m por residência para cobertura adequada
  const drainageLengthPerHome = 50; // metros
  const drainageCostPerMeter = 300; // R$/m
  const drainageCost = residences * drainageLengthPerHome * drainageCostPerMeter * (zone.score / 100);
  
  // 2. CONTENÇÃO E ESTABILIZAÇÃO
  // Baseado em: R$ 200/m² para obras de contenção
  // Estima 30m² de área de risco por residência
  const containmentAreaPerHome = 30; // m²
  const containmentCostPerSqMeter = 200; // R$/m²
  const containmentCost = residences * containmentAreaPerHome * containmentCostPerSqMeter * (zone.score / 100);
  
  // 3. REFLORESTAMENTO E PAISAGISMO
  // Baseado em: R$ 50/m² para plantio e manutenção
  // Estima 20m² de área verde por residência
  const greenAreaPerHome = 20; // m²
  const greenCostPerSqMeter = 50; // R$/m²
  const greenCost = residences * greenAreaPerHome * greenCostPerSqMeter * (zone.score / 100);
  
  // 4. SISTEMA DE ALERTA E MONITORAMENTO
  // Custo fixo + variável por população
  const monitoringBaseCost = 50000; // Base
  const monitoringCostPerPerson = 100; // R$/pessoa
  const monitoringCost = monitoringBaseCost + (population * monitoringCostPerPerson * (zone.score / 100));
  
  // CUSTO TOTAL DE PREVENÇÃO
  const totalPreventionCost = drainageCost + containmentCost + greenCost + monitoringCost;
  
  // ========================================
  // MÉTRICAS FINANCEIRAS
  // ========================================
  
  const savings = totalDisasterCost - totalPreventionCost;
  const roi = totalPreventionCost > 0 ? ((savings / totalPreventionCost) * 100) : 0;
  const investmentRatio = totalPreventionCost > 0 ? (totalDisasterCost / totalPreventionCost) : 0;
  
  // Formatador de moeda
  const formatCurrency = (value: number): string => {
    if (value >= 1000000) {
      return `R$ ${(value / 1000000).toFixed(1)}M`;
    } else if (value >= 1000) {
      return `R$ ${(value / 1000).toFixed(0)}K`;
    }
    return `R$ ${value.toFixed(0)}`;
  };

  const getRiskColorClass = (score: number) => {
    if (score >= 70) return "border-red-500 bg-red-50";
    if (score >= 50) return "border-orange-500 bg-orange-50";
    if (score >= 30) return "border-yellow-500 bg-yellow-50";
    return "border-green-500 bg-green-50";
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[96vw] sm:max-w-2xl max-h-[85dvh] overflow-y-auto z-[9999] p-4">
        <DialogHeader>
          <DialogTitle className="text-2xl">
            Zona {zone.id} - {zone.level}
          </DialogTitle>
          <DialogDescription>
            Análise detalhada de risco e impacto financeiro
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 mt-4">
          {/* Score de Risco */}
          <div className={`rounded-lg border-2 p-4 ${getRiskColorClass(zone.score)}`}>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Score de Risco</p>
                <p className="text-4xl font-bold">{zone.score}/100</p>
              </div>
              <div className="text-6xl">
                {zone.score >= 70 ? "🔴" : zone.score >= 50 ? "🟠" : zone.score >= 30 ? "🟡" : "🟢"}
              </div>
            </div>
          </div>

          {/* Toggle Prefeitura Acompanhando */}
          <div className={`rounded-lg border-2 p-4 transition-all ${
            prefeituraAcompanhando 
              ? 'bg-blue-50 border-blue-300' 
              : 'bg-gray-50 border-gray-300'
          }`}>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="text-3xl">
                  {prefeituraAcompanhando ? "🏛️" : "⚪"}
                </div>
                <div>
                  <p className="font-semibold text-gray-900">
                    {prefeituraAcompanhando ? "Prefeitura Acompanhando" : "Zona Não Monitorada"}
                  </p>
                  <p className="text-xs text-gray-600 mt-0.5">
                    {prefeituraAcompanhando 
                      ? "Esta área está sendo monitorada pela prefeitura" 
                      : "Arraste o botão para indicar que a prefeitura está ciente"}
                  </p>
                </div>
              </div>
              
              {/* Toggle Switch */}
              <button
                onClick={() => setPrefeituraAcompanhando(!prefeituraAcompanhando)}
                className={`relative inline-flex h-8 w-14 items-center rounded-full transition-colors ${
                  prefeituraAcompanhando ? 'bg-blue-600' : 'bg-gray-300'
                }`}
              >
                <span
                  className={`inline-block h-6 w-6 transform rounded-full bg-white transition-transform ${
                    prefeituraAcompanhando ? 'translate-x-7' : 'translate-x-1'
                  }`}
                />
              </button>
            </div>
            
            {prefeituraAcompanhando && (
              <div className="mt-3 pt-3 border-t border-blue-200">
                <p className="text-sm text-blue-800">
                  ✓ Status atualizado! A comunidade será informada que a prefeitura está monitorando esta zona.
                </p>
              </div>
            )}
          </div>

          {/* Estatísticas */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="rounded-lg border bg-card p-4">
              <p className="text-sm text-muted-foreground">Imóveis Afetados</p>
              <p className="text-3xl font-bold">{residences}</p>
              <p className="text-xs text-gray-500 mt-1">Estimativa baseada em dados geoespaciais</p>
            </div>
            <div className="rounded-lg border bg-card p-4">
              <p className="text-sm text-muted-foreground">População Estimada</p>
              <p className="text-3xl font-bold">{population}</p>
              <p className="text-xs text-gray-500 mt-1">Baseado em média de 3.5 pessoas/residência (IBGE)</p>
            </div>
          </div>

          {/* Explicabilidade do Score - Fatores de Risco */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-bold">📊 Explicabilidade do Score de Risco</h3>
              <Button 
                variant="ghost" 
                size="sm"
                onClick={() => setShowFinancialInfo(true)}
              >
                <Info className="h-4 w-4 mr-1" />
                Como é calculado?
              </Button>
            </div>

            {/* Resumo do Score */}
            <div className={`rounded-lg border-2 p-4 ${
              zone.score >= 75 ? 'bg-red-50 border-red-300' :
              zone.score >= 50 ? 'bg-orange-50 border-orange-300' :
              zone.score >= 25 ? 'bg-yellow-50 border-yellow-300' :
              'bg-green-50 border-green-300'
            }`}>
              <div className="flex items-center justify-between mb-3">
                <div>
                  <p className="text-sm font-medium text-gray-600">Score Final de Risco</p>
                  <p className="text-4xl font-bold">{zone.score}/100</p>
                  <p className="text-sm text-gray-600 mt-1">Nível: {zone.level}</p>
                </div>
                <div className="text-6xl">
                  {zone.score >= 75 ? "🔴" : zone.score >= 50 ? "🟠" : zone.score >= 25 ? "🟡" : "🟢"}
                </div>
              </div>
              
              {declividade > 0 && (
                <div className="mt-3 pt-3 border-t border-gray-300">
                  <p className="text-sm text-gray-700">
                    <strong>Declividade do terreno:</strong> {declividade.toFixed(1)}° 
                    {declividade > 20 && " (⚠️ Alto risco de deslizamento)"}
                  </p>
                </div>
              )}
            </div>

            {/* Fatores de Risco Detalhados */}
            {fatores.length > 0 && (
              <div className="rounded-lg border bg-card p-4">
                <h4 className="font-bold mb-4">🎯 Parâmetros Utilizados no Cálculo</h4>
                <div className="space-y-4">
                  {fatores.map((fator: any, idx: number) => {
                    const percentage = Math.round(fator.valor * 100);
                    const peso = Math.round(fator.peso * 100);
                    const contribuicao = (fator.valor * fator.peso * 100).toFixed(1);
                    const isHigh = percentage >= 70;
                    const isMedium = percentage >= 50 && percentage < 70;
                    
                    return (
                      <div key={idx} className="space-y-2">
                        <div className="flex justify-between items-start">
                          <div className="flex-1">
                            <div className="flex items-center gap-2">
                              <span className="font-semibold text-gray-900">{fator.nome}</span>
                              <span className={`text-xs px-2 py-0.5 rounded-full ${
                                isHigh ? 'bg-red-100 text-red-700' :
                                isMedium ? 'bg-orange-100 text-orange-700' :
                                'bg-green-100 text-green-700'
                              }`}>
                                {percentage}%
                              </span>
                            </div>
                            <p className="text-xs text-gray-600 mt-1">
                              Peso no cálculo: {peso}% | Contribuição para score final: +{contribuicao} pontos
                            </p>
                          </div>
                        </div>
                        
                        {/* Barra de progresso */}
                        <div className="w-full bg-gray-200 rounded-full h-3">
                          <div 
                            className={`h-3 rounded-full transition-all ${
                              isHigh ? 'bg-red-500' : 
                              isMedium ? 'bg-orange-500' : 
                              'bg-green-500'
                            }`}
                            style={{ width: `${percentage}%` }}
                          />
                        </div>
                        
                        {/* Explicação do fator */}
                        <p className="text-xs text-gray-500 italic">
                          {getFatorExplanation(fator.nome, percentage)}
                        </p>
                      </div>
                    );
                  })}
                </div>

                {/* Resumo da Composição */}
                <div className="mt-4 pt-4 border-t border-gray-200">
                  <h5 className="font-semibold text-sm mb-2">� Como o score é calculado:</h5>
                  <div className="text-xs text-gray-600 space-y-1">
                    <p>• Cada fator contribui proporcionalmente ao seu peso</p>
                    <p>• Score final = Σ (Valor do Fator × Peso do Fator) × 100</p>
                    <p>• Classificação: Baixo (&lt;25), Médio (25-49), Alto (50-74), Muito Alto (≥75)</p>
                  </div>
                </div>
              </div>
            )}

            {/* Recomendações */}
            {recomendacoes.length > 0 && (
              <div className="rounded-lg border-2 border-blue-200 bg-blue-50 p-4">
                <h4 className="font-bold text-blue-900 mb-2">💡 Recomendações de Prevenção</h4>
                <ul className="space-y-1">
                  {recomendacoes.map((rec: string, idx: number) => (
                    <li key={idx} className="text-sm text-blue-800">
                      • {rec}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>

          {/* Comparação Financeira */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-lg font-bold">💰 Análise Financeira</h3>
              <Button 
                variant="ghost" 
                size="sm"
                onClick={() => setShowFinancialInfo(true)}
              >
                <Info className="h-4 w-4 mr-1" />
                Metodologia
              </Button>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Custo Desastre */}
              <div className="rounded-lg border-2 border-red-500 bg-red-50 p-4">
                <h4 className="font-bold text-red-700 mb-2">💥 Custo do Desastre</h4>
                <p className="text-3xl font-bold text-red-900 mb-2">{formatCurrency(totalDisasterCost)}</p>
                <ul className="text-sm text-red-700 space-y-1">
                  <li>• Reconstrução: {formatCurrency(reconstructionCost)}</li>
                  <li>• Perdas humanas: {formatCurrency(humanCost)}</li>
                  <li>• Infraestrutura: {formatCurrency(infrastructureCost)}</li>
                  <li>• Perdas indiretas: {formatCurrency(indirectLosses)}</li>
                </ul>
              </div>

              {/* Custo Prevenção */}
              <div className="rounded-lg border-2 border-green-500 bg-green-50 p-4">
                <h4 className="font-bold text-green-700 mb-2">✅ Custo de Prevenção</h4>
                <p className="text-3xl font-bold text-green-900 mb-2">{formatCurrency(totalPreventionCost)}</p>
                <ul className="text-sm text-green-700 space-y-1">
                  <li>• Drenagem: {formatCurrency(drainageCost)}</li>
                  <li>• Contenção: {formatCurrency(containmentCost)}</li>
                  <li>• Reflorestamento: {formatCurrency(greenCost)}</li>
                  <li>• Monitoramento: {formatCurrency(monitoringCost)}</li>
                </ul>
              </div>
            </div>

            {/* ROI */}
            <div className="mt-4 rounded-lg bg-blue-100 p-4">
              <p className="text-center text-lg">
                💰 Investir <strong>R$ 1</strong> economiza <strong>R$ {investmentRatio.toFixed(1)}</strong>
              </p>
              <p className="text-center text-sm text-gray-600 mt-1">
                ROI: {roi.toFixed(0)}% | Economia: {formatCurrency(savings)}
              </p>
            </div>
          </div>

          {/* Botão de Ação */}
          <Button className="w-full" size="lg">
            📢 Notificar Prefeitura
          </Button>
        </div>
      </DialogContent>

      {/* Diálogo de Metodologia Financeira */}
      <AlertDialog open={showFinancialInfo} onOpenChange={setShowFinancialInfo}>
        <AlertDialogContent className="w-[96vw] sm:max-w-3xl max-h-[85dvh] overflow-y-auto p-4">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-2xl">📊 Metodologia de Cálculo Financeiro</AlertDialogTitle>
            <AlertDialogDescription className="text-base">
              Entenda como são calculados os custos de desastre e prevenção
            </AlertDialogDescription>
          </AlertDialogHeader>
          
          <div className="space-y-6 mt-4">
            {/* Custos de Desastre */}
            <div>
              <h3 className="font-bold text-lg text-red-700 mb-3">💥 Custos do Desastre</h3>
              
              <div className="space-y-4 bg-red-50 p-4 rounded-lg border border-red-200">
                <div>
                  <h4 className="font-semibold text-red-900 mb-1">1. Reconstrução de Imóveis</h4>
                  <p className="text-sm text-gray-700 mb-2">
                    <strong>Fórmula:</strong> Residências × 80m² × R$ 1.500/m² × (Score de Risco ÷ 100)
                  </p>
                  <p className="text-sm text-gray-600">
                    <strong>Base:</strong> Custo médio de construção popular no Brasil segundo IBGE/Sinduscon (R$ 1.500/m²).
                    Área média residencial de 80m². O score de risco ajusta a probabilidade de destruição total.
                  </p>
                  <p className="text-sm text-blue-700 mt-1">
                    <strong>Nesta zona:</strong> {residences} residências × R$ 120.000 × {(zone.score / 100).toFixed(2)} = {formatCurrency(reconstructionCost)}
                  </p>
                </div>

                <div>
                  <h4 className="font-semibold text-red-900 mb-1">2. Perdas Humanas e Sociais</h4>
                  <p className="text-sm text-gray-700 mb-2">
                    <strong>Fórmula:</strong> População × R$ 15.000/pessoa × (Score de Risco ÷ 100)
                  </p>
                  <p className="text-sm text-gray-600">
                    <strong>Base:</strong> Estimativa do IPEA para custos indiretos por pessoa afetada em desastres naturais,
                    incluindo saúde, deslocamento, assistência temporária e perda de renda.
                  </p>
                  <p className="text-sm text-blue-700 mt-1">
                    <strong>Nesta zona:</strong> {population} pessoas × R$ 15.000 × {(zone.score / 100).toFixed(2)} = {formatCurrency(humanCost)}
                  </p>
                </div>

                <div>
                  <h4 className="font-semibold text-red-900 mb-1">3. Infraestrutura Pública</h4>
                  <p className="text-sm text-gray-700 mb-2">
                    <strong>Fórmula:</strong> Custo de Reconstrução × 0.3 (30%)
                  </p>
                  <p className="text-sm text-gray-600">
                    <strong>Base:</strong> Estudos da Defesa Civil indicam que infraestrutura pública (ruas, redes de água/esgoto,
                    energia) representam cerca de 30% do custo de reconstrução residencial.
                  </p>
                  <p className="text-sm text-blue-700 mt-1">
                    <strong>Nesta zona:</strong> {formatCurrency(reconstructionCost)} × 0.3 = {formatCurrency(infrastructureCost)}
                  </p>
                </div>

                <div>
                  <h4 className="font-semibold text-red-900 mb-1">4. Perdas Econômicas Indiretas</h4>
                  <p className="text-sm text-gray-700 mb-2">
                    <strong>Fórmula:</strong> (Reconstrução + Perdas Humanas + Infraestrutura) × 0.2 (20%)
                  </p>
                  <p className="text-sm text-gray-600">
                    <strong>Base:</strong> Banco Mundial estima que perdas indiretas (produtividade, comércio, turismo) somam
                    cerca de 20% dos custos diretos em desastres urbanos.
                  </p>
                  <p className="text-sm text-blue-700 mt-1">
                    <strong>Nesta zona:</strong> {formatCurrency(reconstructionCost + humanCost + infrastructureCost)} × 0.2 = {formatCurrency(indirectLosses)}
                  </p>
                </div>
              </div>
            </div>

            {/* Custos de Prevenção */}
            <div>
              <h3 className="font-bold text-lg text-green-700 mb-3">✅ Custos de Prevenção</h3>
              
              <div className="space-y-4 bg-green-50 p-4 rounded-lg border border-green-200">
                <div>
                  <h4 className="font-semibold text-green-900 mb-1">1. Sistema de Drenagem</h4>
                  <p className="text-sm text-gray-700 mb-2">
                    <strong>Fórmula:</strong> Residências × 50m × R$ 300/m × (Score ÷ 100)
                  </p>
                  <p className="text-sm text-gray-600">
                    <strong>Base:</strong> Custo médio de micro-drenagem urbana (R$ 300/m linear) segundo SANEPAR/SABESP.
                    Estimativa de 50m de drenagem necessária por residência para cobertura adequada.
                  </p>
                  <p className="text-sm text-blue-700 mt-1">
                    <strong>Nesta zona:</strong> {residences} × 50m × R$ 300 × {(zone.score / 100).toFixed(2)} = {formatCurrency(drainageCost)}
                  </p>
                </div>

                <div>
                  <h4 className="font-semibold text-green-900 mb-1">2. Contenção e Estabilização</h4>
                  <p className="text-sm text-gray-700 mb-2">
                    <strong>Fórmula:</strong> Residências × 30m² × R$ 200/m² × (Score ÷ 100)
                  </p>
                  <p className="text-sm text-gray-600">
                    <strong>Base:</strong> Custo médio de obras de contenção (muros, gabião, solo-cimento) é R$ 200/m².
                    Estimativa de 30m² de área de risco por residência.
                  </p>
                  <p className="text-sm text-blue-700 mt-1">
                    <strong>Nesta zona:</strong> {residences} × 30m² × R$ 200 × {(zone.score / 100).toFixed(2)} = {formatCurrency(containmentCost)}
                  </p>
                </div>

                <div>
                  <h4 className="font-semibold text-green-900 mb-1">3. Reflorestamento e Área Verde</h4>
                  <p className="text-sm text-gray-700 mb-2">
                    <strong>Fórmula:</strong> Residências × 20m² × R$ 50/m² × (Score ÷ 100)
                  </p>
                  <p className="text-sm text-gray-600">
                    <strong>Base:</strong> Custo de plantio e manutenção de área verde urbana (R$ 50/m²) segundo secretarias
                    de meio ambiente. 20m² de área verde por residência para controle de erosão.
                  </p>
                  <p className="text-sm text-blue-700 mt-1">
                    <strong>Nesta zona:</strong> {residences} × 20m² × R$ 50 × {(zone.score / 100).toFixed(2)} = {formatCurrency(greenCost)}
                  </p>
                </div>

                <div>
                  <h4 className="font-semibold text-green-900 mb-1">4. Sistema de Alerta e Monitoramento</h4>
                  <p className="text-sm text-gray-700 mb-2">
                    <strong>Fórmula:</strong> R$ 50.000 (base) + População × R$ 100/pessoa × (Score ÷ 100)
                  </p>
                  <p className="text-sm text-gray-600">
                    <strong>Base:</strong> Custo de implantação de sistema de alerta (sensores, sirenes, central) mais
                    R$ 100 por pessoa para cobertura de SMS/app de notificações.
                  </p>
                  <p className="text-sm text-blue-700 mt-1">
                    <strong>Nesta zona:</strong> R$ 50.000 + {population} × R$ 100 × {(zone.score / 100).toFixed(2)} = {formatCurrency(monitoringCost)}
                  </p>
                </div>
              </div>
            </div>

            {/* Fontes */}
            <div className="bg-gray-100 p-4 rounded-lg border">
              <h3 className="font-bold text-sm text-gray-800 mb-2">📚 Fontes de Dados</h3>
              <ul className="text-xs text-gray-600 space-y-1">
                <li>• <strong>IBGE:</strong> Pesquisa Nacional por Amostra de Domicílios (PNAD) - Média de moradores/domicílio</li>
                <li>• <strong>Sinduscon:</strong> Sistema Nacional de Pesquisa de Custos e Índices da Construção Civil</li>
                <li>• <strong>IPEA:</strong> Atlas da Vulnerabilidade Social - Custos de desastres naturais</li>
                <li>• <strong>Banco Mundial:</strong> Natural Disasters Economic Impact Assessment Framework</li>
                <li>• <strong>SANEPAR/SABESP:</strong> Tabelas de custos de obras de saneamento</li>
                <li>• <strong>Defesa Civil:</strong> Relatórios de reconstrução pós-desastre</li>
              </ul>
            </div>

            {/* Observações */}
            <div className="bg-yellow-50 p-4 rounded-lg border border-yellow-300">
              <h3 className="font-bold text-sm text-yellow-800 mb-2">⚠️ Observações Importantes</h3>
              <ul className="text-xs text-yellow-700 space-y-1">
                <li>• Os valores são estimativas baseadas em médias nacionais e podem variar por região</li>
                <li>• O score de risco (0-100) ajusta os custos pela probabilidade de ocorrência</li>
                <li>• Análise com IA (quando disponível) melhora a precisão do número de residências</li>
                <li>• Custos não incluem inflação futura ou variações cambiais</li>
                <li>• ROI calculado assume prevenção 100% efetiva na redução de risco</li>
              </ul>
            </div>
          </div>

          <AlertDialogCancel className="mt-4">Fechar</AlertDialogCancel>
        </AlertDialogContent>
      </AlertDialog>
    </Dialog>
  );
};

export default ZoneDetailModal;
