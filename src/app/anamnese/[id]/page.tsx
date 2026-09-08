'use client'

import { useState, useEffect } from 'react'
import { Switch } from '@/components/ui/switch'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Checkbox } from '@/components/ui/checkbox'
import { useToast } from '@/hooks/use-toast'
import { Info } from 'lucide-react'

import { use } from 'react'

export default function AnamnesisPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const { toast } = useToast()
  
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [clientName, setClientName] = useState('')
  const [signed, setSigned] = useState(false)
  const [signatureDate, setSignatureDate] = useState<string | null>(null)

  const [form, setForm] = useState({
    hadExtensionBefore: false,
    timeWithoutExtension: '',
    previousReactions: '',
    wearingMakeup: false,
    hasAllergies: false,
    thyroidProblem: false,
    sleepingSide: '',
    recentEyeProcedure: false,
    pregnantOrNursing: false,
    oncologicalTreatment: false,
    skinDisease: false,
    healthTreatment: false,
    usingMedication: false,
    blepharitis: false,
    wantsLongLashes: false,
    wantsCurvedLashes: false,
    expectedResult: '',
    eyeStylePreference: '',
    photoAuthorization: false,
    termsAccepted: false
  })

  useEffect(() => {
    fetch(`/api/clients/${id}/anamnese`)
      .then(res => res.json())
      .then(data => {
        if (data.client) {
          setClientName(data.client.name)
          if (data.client.anamnesis) {
            setForm({ ...form, ...data.client.anamnesis })
            if (data.client.anamnesis.termsAcceptedAt) {
              setSigned(true)
              setSignatureDate(new Date(data.client.anamnesis.termsAcceptedAt).toLocaleString('pt-BR'))
            }
          }
        }
      })
      .finally(() => setLoading(false))
  }, [id])

  const updateForm = (key: string, val: any) => {
    setForm(prev => ({ ...prev, [key]: val }))
  }

  const save = async () => {
    if (!form.termsAccepted) {
      toast({ title: 'Atenção', description: 'Você precisa aceitar os termos.', variant: 'destructive' })
      return
    }
    setSaving(true)
    try {
      const res = await fetch(`/api/clients/${id}/anamnese`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form)
      })
      if (!res.ok) throw new Error('Falha ao salvar')
      
      setSigned(true)
      setSignatureDate(new Date().toLocaleString('pt-BR'))
      toast({ title: 'Sucesso', description: 'Termo assinado com sucesso!' })
    } catch (e: any) {
      toast({ title: 'Erro', description: e.message, variant: 'destructive' })
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return <div className="p-8 text-center text-pink-500">Carregando questionário...</div>
  }

  return (
    <div className="max-w-2xl mx-auto p-4 sm:p-6 bg-white min-h-screen text-slate-800">
      <div className="text-center mb-8">
        <h1 className="text-xl font-bold text-pink-500">Saúde do cliente</h1>
        <p className="text-sm text-slate-500">Olá, {clientName}</p>
      </div>

      <div className="space-y-4">
        <QuestionItem label="Já fez extensão de cílios antes?">
          <Switch checked={form.hadExtensionBefore} onCheckedChange={v => updateForm('hadExtensionBefore', v)} className="data-[state=checked]:bg-green-500" />
        </QuestionItem>

        {form.hadExtensionBefore && (
          <div className="p-4 bg-pink-400 rounded-lg space-y-4">
            <div>
              <Label className="text-white mb-2 block">Há quanto tempo?</Label>
              <Input className="bg-white border-0" value={form.timeWithoutExtension} onChange={e => updateForm('timeWithoutExtension', e.target.value)} />
            </div>
            <div>
              <Label className="text-white mb-2 block">Teve alguma reação?</Label>
              <Input className="bg-white border-0" value={form.previousReactions} onChange={e => updateForm('previousReactions', e.target.value)} />
            </div>
          </div>
        )}

        <QuestionItem label="Está de rímel ou maquiagem na região dos olhos?">
          <Switch checked={form.wearingMakeup} onCheckedChange={v => updateForm('wearingMakeup', v)} className="data-[state=checked]:bg-green-500" />
        </QuestionItem>

        <QuestionItem label="Você tem alguma alergia?">
          <Switch checked={form.hasAllergies} onCheckedChange={v => updateForm('hasAllergies', v)} className="data-[state=checked]:bg-green-500" />
        </QuestionItem>

        <QuestionItem label="Você tem problema de tireoide?">
          <Switch checked={form.thyroidProblem} onCheckedChange={v => updateForm('thyroidProblem', v)} className="data-[state=checked]:bg-green-500" />
        </QuestionItem>

        <QuestionItem label="Você dorme de qual lado?">
          <RadioGroup 
            value={form.sleepingSide} 
            onValueChange={v => updateForm('sleepingSide', v)}
            className="flex items-center gap-4 text-pink-500"
          >
            <div className="flex items-center gap-1"><RadioGroupItem value="Direito" id="r1" /><Label htmlFor="r1">Direito</Label></div>
            <div className="flex items-center gap-1"><RadioGroupItem value="Esquerdo" id="r2" /><Label htmlFor="r2">Esquerdo</Label></div>
            <div className="flex items-center gap-1"><RadioGroupItem value="dois lados" id="r3" /><Label htmlFor="r3">dois lados</Label></div>
          </RadioGroup>
        </QuestionItem>

        <QuestionItem label="Fez algum procedimento na região dos olhos recentemente?">
          <Switch checked={form.recentEyeProcedure} onCheckedChange={v => updateForm('recentEyeProcedure', v)} className="data-[state=checked]:bg-green-500" />
        </QuestionItem>

        <QuestionItem label="Você está gestante ou amamentando?">
          <Switch checked={form.pregnantOrNursing} onCheckedChange={v => updateForm('pregnantOrNursing', v)} className="data-[state=checked]:bg-green-500" />
        </QuestionItem>

        <QuestionItem label="Já fez ou faz tratamento oncológico?">
          <Switch checked={form.oncologicalTreatment} onCheckedChange={v => updateForm('oncologicalTreatment', v)} className="data-[state=checked]:bg-green-500" />
        </QuestionItem>

        <QuestionItem label="Possui alguma doença de pele?">
          <Switch checked={form.skinDisease} onCheckedChange={v => updateForm('skinDisease', v)} className="data-[state=checked]:bg-green-500" />
        </QuestionItem>

        <QuestionItem label="Está em algum tratamento de saúde">
          <Switch checked={form.healthTreatment} onCheckedChange={v => updateForm('healthTreatment', v)} className="data-[state=checked]:bg-green-500" />
        </QuestionItem>

        <QuestionItem label="Faz uso de algum medicamento?">
          <Switch checked={form.usingMedication} onCheckedChange={v => updateForm('usingMedication', v)} className="data-[state=checked]:bg-green-500" />
        </QuestionItem>

        <QuestionItem label="Possui blefarite (inflamação na pálpebra)?">
          <Switch checked={form.blepharitis} onCheckedChange={v => updateForm('blepharitis', v)} className="data-[state=checked]:bg-green-500" />
        </QuestionItem>

        <QuestionItem label="Quer cílios grandes?">
          <Switch checked={form.wantsLongLashes} onCheckedChange={v => updateForm('wantsLongLashes', v)} className="data-[state=checked]:bg-green-500" />
        </QuestionItem>

        <QuestionItem label="Quer cílios curvados?">
          <Switch checked={form.wantsCurvedLashes} onCheckedChange={v => updateForm('wantsCurvedLashes', v)} className="data-[state=checked]:bg-green-500" />
        </QuestionItem>

        <div className="border rounded-lg p-4 space-y-2 text-sm text-slate-600">
          <Label className="block">Qual resultado espera?</Label>
          <Textarea 
            value={form.expectedResult} 
            onChange={e => updateForm('expectedResult', e.target.value)}
            placeholder="Gostaria de cílios efeito sirena ou gatinho"
            className="bg-slate-50/50"
          />
        </div>

        <div className="border rounded-lg p-4 space-y-2 text-sm text-slate-600">
          <Label className="block">Quer um resultado de um olho maior, arredondado, um olho menor e mais alongado, ou um olho harmônico com seu tipo de rosto?</Label>
          <Textarea 
            value={form.eyeStylePreference} 
            onChange={e => updateForm('eyeStylePreference', e.target.value)}
            placeholder="Olhar mais alongado e harmônico"
            className="bg-slate-50/50"
          />
        </div>

        <QuestionItem label='Autorizo o registro fotográfico do "antes" e "depois" para documentação e divulgação do profissional'>
          <Switch checked={form.photoAuthorization} onCheckedChange={v => updateForm('photoAuthorization', v)} className="data-[state=checked]:bg-green-500" />
        </QuestionItem>

        {/* Termo de Consentimento */}
        <div className="mt-8 pt-8 border-t border-dashed">
          <div className="flex items-center justify-center gap-2 mb-6 text-red-500 text-sm font-semibold">
            <span>Importante</span>
            <Info className="w-5 h-5 bg-red-500 text-white rounded-full p-0.5" />
          </div>

          <div className="text-xs text-slate-600 space-y-3 leading-relaxed">
            <p className="font-bold text-slate-800 text-sm">Extensão de cílios:</p>
            <p>A extensão de cílios não danifica o fio natural, desde que os cuidados sejam tomados.</p>
            <p>As alergias são raras, mas podem ocorrer. Qualquer incômodo após o procedimento deve ser informado e conversado com a profissional em até 24 horas.</p>
            <p>O procedimento de extensão de cílios foi totalmente explicado, de forma que entendo a natureza, as características, os alcances e limitações do procedimento. Fui claramente informado (a) de todos os riscos e consequências estando consciente e de acordo, assumindo cada um dos eventuais riscos e complicações que possam ocorrer por ocasião do procedimento.</p>
            <p>Foram-me esclarecidos detalhadamente todos os cuidados que devo seguir a fim de evitar complicações. Foi me dada ampla oportunidade de esclarecer todas as minhas dúvidas, sendo elas respondidas satisfatoriamente, isentando a empresa e a profissional da responsabilidade por quaisquer danos que possam ocorrer, sejam eles materiais ou morais.</p>
            <p>Estou ciente que a falta de cuidados e higiene pode comprometer a qualidade e a durabilidade da minha extensão.</p>
            <p>Assumo total responsabilidade e consequência que derivam da minha decisão de fazer a extensão de cílios.</p>
            <p>Autorizo fotografarem o "antes" eo "depois" para fins de portfólio, divulgação nas redes sociais da profissional.</p>
            <p>Certifico que todos os itens acima foram esclarecidos e que não ficou nenhuma dúvida.</p>
          </div>

          <div className="mt-6">
            <p className="text-center text-pink-500 text-sm mb-3">Clique abaixo para aceitar o termo de autorização</p>
            <div className="border rounded-lg p-4">
              <div className="flex items-start gap-2">
                <Checkbox 
                  id="terms" 
                  checked={form.termsAccepted} 
                  onCheckedChange={v => updateForm('termsAccepted', v)}
                  disabled={signed}
                />
                <Label htmlFor="terms" className="text-xs font-normal leading-tight mt-0.5">
                  Certifico que todos os itens acima foram esclarecidos e que não ficou nenhuma dúvida.
                  {signed && signatureDate && <span className="font-bold ml-1">Data/Hora: {signatureDate}</span>}
                </Label>
              </div>
            </div>
          </div>
        </div>

        <div className="pt-4 pb-12">
          {signed ? (
            <div className="w-full bg-pink-400 text-white font-medium py-3 rounded-full text-center">
              Termo assinado com sucesso!
            </div>
          ) : (
            <Button 
              className="w-full bg-pink-500 hover:bg-pink-600 text-white rounded-full py-6 text-base"
              onClick={save}
              disabled={saving}
            >
              Assinar termo
            </Button>
          )}
        </div>

      </div>
    </div>
  )
}

function QuestionItem({ label, children }: { label: string, children: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-4 p-3 border rounded-lg bg-white shadow-sm">
      <span className="text-sm text-slate-700">{label}</span>
      <div className="shrink-0">{children}</div>
    </div>
  )
}
