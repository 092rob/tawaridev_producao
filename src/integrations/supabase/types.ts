export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      agendas_positivas: {
        Row: {
          account_number: string | null
          created_at: string
          description: string
          glosa_reason: string | null
          id: string
          insurance: string
          observations: string | null
          opening_date: string
          reopening_count: number | null
          resolved_at: string | null
          responsible_id: string | null
          responsible_sector: string
          responsible_user: string | null
          so_number: number
          status: string
          subject: string
          treatment_count: number | null
          updated_at: string
          user_id: string
        }
        Insert: {
          account_number?: string | null
          created_at?: string
          description: string
          glosa_reason?: string | null
          id?: string
          insurance: string
          observations?: string | null
          opening_date?: string
          reopening_count?: number | null
          resolved_at?: string | null
          responsible_id?: string | null
          responsible_sector: string
          responsible_user?: string | null
          so_number?: number
          status?: string
          subject: string
          treatment_count?: number | null
          updated_at?: string
          user_id?: string
        }
        Update: {
          account_number?: string | null
          created_at?: string
          description?: string
          glosa_reason?: string | null
          id?: string
          insurance?: string
          observations?: string | null
          opening_date?: string
          reopening_count?: number | null
          resolved_at?: string | null
          responsible_id?: string | null
          responsible_sector?: string
          responsible_user?: string | null
          so_number?: number
          status?: string
          subject?: string
          treatment_count?: number | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "agendas_positivas_responsible_id_fkey"
            columns: ["responsible_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "agendas_positivas_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      api_zg_sync_state: {
        Row: {
          created_at: string
          id: number
          last_run_at: string | null
          last_total_processados: number | null
          last_ultima_atualizacao: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: number
          last_run_at?: string | null
          last_total_processados?: number | null
          last_ultima_atualizacao?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: number
          last_run_at?: string | null
          last_total_processados?: number | null
          last_ultima_atualizacao?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      bi_api_imports: {
        Row: {
          cancel_requested: boolean
          error: string | null
          filter_from: string | null
          finished_at: string | null
          has_more: boolean
          id: string
          last_search_after: string | null
          mode: string
          pages: number
          planned_pages: number | null
          query_id: string
          rows_fetched: number
          rows_upserted: number
          started_at: string
          status: string
          total_rows: number | null
          triggered_by: string | null
        }
        Insert: {
          cancel_requested?: boolean
          error?: string | null
          filter_from?: string | null
          finished_at?: string | null
          has_more?: boolean
          id?: string
          last_search_after?: string | null
          mode: string
          pages?: number
          planned_pages?: number | null
          query_id: string
          rows_fetched?: number
          rows_upserted?: number
          started_at?: string
          status?: string
          total_rows?: number | null
          triggered_by?: string | null
        }
        Update: {
          cancel_requested?: boolean
          error?: string | null
          filter_from?: string | null
          finished_at?: string | null
          has_more?: boolean
          id?: string
          last_search_after?: string | null
          mode?: string
          pages?: number
          planned_pages?: number | null
          query_id?: string
          rows_fetched?: number
          rows_upserted?: number
          started_at?: string
          status?: string
          total_rows?: number | null
          triggered_by?: string | null
        }
        Relationships: []
      }
      bi_drive_imports: {
        Row: {
          error: string | null
          file_name: string | null
          finished_at: string | null
          id: string
          rows_loaded: number
          source: string
          started_at: string
          status: string
          triggered_by: string | null
        }
        Insert: {
          error?: string | null
          file_name?: string | null
          finished_at?: string | null
          id?: string
          rows_loaded?: number
          source: string
          started_at?: string
          status?: string
          triggered_by?: string | null
        }
        Update: {
          error?: string | null
          file_name?: string | null
          finished_at?: string | null
          id?: string
          rows_loaded?: number
          source?: string
          started_at?: string
          status?: string
          triggered_by?: string | null
        }
        Relationships: []
      }
      bi_drive_records: {
        Row: {
          cliente_id: string | null
          created_at: string
          data_ultima_atualizacao: string | null
          entidade_id: string | null
          id: number
          import_id: string | null
          raw: Json
        }
        Insert: {
          cliente_id?: string | null
          created_at?: string
          data_ultima_atualizacao?: string | null
          entidade_id?: string | null
          id: number
          import_id?: string | null
          raw: Json
        }
        Update: {
          cliente_id?: string | null
          created_at?: string
          data_ultima_atualizacao?: string | null
          entidade_id?: string | null
          id?: number
          import_id?: string | null
          raw?: Json
        }
        Relationships: [
          {
            foreignKeyName: "bi_drive_records_import_id_fkey"
            columns: ["import_id"]
            isOneToOne: false
            referencedRelation: "bi_drive_imports"
            referencedColumns: ["id"]
          },
        ]
      }
      cbhpm_portes: {
        Row: {
          created_at: string | null
          id: string
          id_tabela: string | null
          porte: string
          valor: number
        }
        Insert: {
          created_at?: string | null
          id?: string
          id_tabela?: string | null
          porte: string
          valor: number
        }
        Update: {
          created_at?: string | null
          id?: string
          id_tabela?: string | null
          porte?: string
          valor?: number
        }
        Relationships: []
      }
      cbhpm_procedimentos: {
        Row: {
          codigo: string | null
          codigo_anatomico: string | null
          created_at: string | null
          custo_operacional: number | null
          descricao_grupo: string | null
          descricao_subgrupo: string | null
          fator_multiplicativo: number | null
          filmes: number | null
          id: string
          id_grupo: string | null
          id_subgrupo: string | null
          id_tabela: string | null
          incidencia: number | null
          num_auxiliares: number | null
          porte: string | null
          porte_anestesico: string | null
          procedimento: string
          uco: number | null
          unidade_radiofarmaco: string | null
          updated_at: string | null
        }
        Insert: {
          codigo?: string | null
          codigo_anatomico?: string | null
          created_at?: string | null
          custo_operacional?: number | null
          descricao_grupo?: string | null
          descricao_subgrupo?: string | null
          fator_multiplicativo?: number | null
          filmes?: number | null
          id?: string
          id_grupo?: string | null
          id_subgrupo?: string | null
          id_tabela?: string | null
          incidencia?: number | null
          num_auxiliares?: number | null
          porte?: string | null
          porte_anestesico?: string | null
          procedimento: string
          uco?: number | null
          unidade_radiofarmaco?: string | null
          updated_at?: string | null
        }
        Update: {
          codigo?: string | null
          codigo_anatomico?: string | null
          created_at?: string | null
          custo_operacional?: number | null
          descricao_grupo?: string | null
          descricao_subgrupo?: string | null
          fator_multiplicativo?: number | null
          filmes?: number | null
          id?: string
          id_grupo?: string | null
          id_subgrupo?: string | null
          id_tabela?: string | null
          incidencia?: number | null
          num_auxiliares?: number | null
          porte?: string | null
          porte_anestesico?: string | null
          procedimento?: string
          uco?: number | null
          unidade_radiofarmaco?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      cbhpm_versoes: {
        Row: {
          created_at: string
          id_tabela: string
          nome_tabela: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id_tabela: string
          nome_tabela: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id_tabela?: string
          nome_tabela?: string
          updated_at?: string
        }
        Relationships: []
      }
      dashboard_access: {
        Row: {
          dashboard_id: string
          granted_at: string
          id: string
          user_id: string
        }
        Insert: {
          dashboard_id: string
          granted_at?: string
          id?: string
          user_id: string
        }
        Update: {
          dashboard_id?: string
          granted_at?: string
          id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "dashboard_access_dashboard_id_fkey"
            columns: ["dashboard_id"]
            isOneToOne: false
            referencedRelation: "dashboards"
            referencedColumns: ["id"]
          },
        ]
      }
      dashboards: {
        Row: {
          created_at: string
          created_by: string | null
          description: string | null
          embed_url: string
          id: string
          title: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          description?: string | null
          embed_url: string
          id?: string
          title: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          description?: string | null
          embed_url?: string
          id?: string
          title?: string
        }
        Relationships: []
      }
      demand_annotations: {
        Row: {
          content: string
          created_at: string
          demand_id: string
          id: string
          user_id: string
        }
        Insert: {
          content: string
          created_at?: string
          demand_id: string
          id?: string
          user_id: string
        }
        Update: {
          content?: string
          created_at?: string
          demand_id?: string
          id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "demand_annotations_demand_id_fkey"
            columns: ["demand_id"]
            isOneToOne: false
            referencedRelation: "agendas_positivas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "demand_annotations_user_id_profiles_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      glosa_dashboard_access: {
        Row: {
          granted_at: string
          granted_by: string | null
          user_id: string
        }
        Insert: {
          granted_at?: string
          granted_by?: string | null
          user_id: string
        }
        Update: {
          granted_at?: string
          granted_by?: string | null
          user_id?: string
        }
        Relationships: []
      }
      glosa_motivos_dashboard_access: {
        Row: {
          granted_at: string
          granted_by: string | null
          user_id: string
        }
        Insert: {
          granted_at?: string
          granted_by?: string | null
          user_id: string
        }
        Update: {
          granted_at?: string
          granted_by?: string | null
          user_id?: string
        }
        Relationships: []
      }
      glosa_motivos_records: {
        Row: {
          centro_custos: string | null
          codigo_centro_custos: string | null
          codigo_item_convenio: string | null
          codigo_motivo_glosa: string | null
          codigo_motivo_glosa_tiss: string | null
          codigo_operadora: string | null
          comentario_de_aceite: string | null
          complemento_motivo_glosa: string | null
          conta_integralmente_glosada: string | null
          convenio_nome: string | null
          created_at: string
          data_aceite: string | null
          data_analise: string | null
          data_atendimento: string | null
          data_envio_recurso_item: string | null
          data_envio_recurso_lote: string | null
          data_pagamento: string | null
          data_realizacao: string | null
          data_recebimento: string | null
          data_recurso: string | null
          data_saida_guia: string | null
          descricao_item_convenio: string | null
          descricao_motivo_glosa: string | null
          descricao_motivo_glosa_tiss: string | null
          descricao_primeiro_motivo_glosa: string | null
          descricao_tipo_glosa: string | null
          diferenca: number | null
          glosa_aceita: number | null
          glosa_em_analise: number | null
          glosa_mantida: number | null
          glosa_pendente_retorno: number | null
          glosa_recuperada: number | null
          glosa_recursada: number | null
          glosa_refaturada: number | null
          glosa_submetida: number | null
          grau_participacao: number | null
          guia_associada: string | null
          guia_recurso: string | null
          id: string
          id_guia: string | null
          id_item: string | null
          justificativa_aceite: string | null
          justificativa_de_recurso: string | null
          justificativa_recurso: string | null
          mes_pagamento: string | null
          nome_paciente: string | null
          num_atendimento: string | null
          num_conta: string | null
          num_parcial_recurso: number | null
          num_proc_complementar: string | null
          protocolo_envio_recurso_item: string | null
          protocolo_recurso_lote: string | null
          qtde_faturada: number | null
          qtde_paga: number | null
          raw: Json
          situacao_envio_recurso: string | null
          status_analise: string | null
          tipo_guia: string | null
          tipo_produto: string | null
          tipo_tabela: string | null
          upload_id: string
          usuario_envio_recurso_item: string | null
          usuario_realizou_aceite: string | null
          usuario_realizou_recurso: string | null
          valor_apresentado: number | null
          valor_faturado: number | null
          valor_pago: number | null
          vlr_unit_conv: number | null
          vlr_unit_faturado: number | null
        }
        Insert: {
          centro_custos?: string | null
          codigo_centro_custos?: string | null
          codigo_item_convenio?: string | null
          codigo_motivo_glosa?: string | null
          codigo_motivo_glosa_tiss?: string | null
          codigo_operadora?: string | null
          comentario_de_aceite?: string | null
          complemento_motivo_glosa?: string | null
          conta_integralmente_glosada?: string | null
          convenio_nome?: string | null
          created_at?: string
          data_aceite?: string | null
          data_analise?: string | null
          data_atendimento?: string | null
          data_envio_recurso_item?: string | null
          data_envio_recurso_lote?: string | null
          data_pagamento?: string | null
          data_realizacao?: string | null
          data_recebimento?: string | null
          data_recurso?: string | null
          data_saida_guia?: string | null
          descricao_item_convenio?: string | null
          descricao_motivo_glosa?: string | null
          descricao_motivo_glosa_tiss?: string | null
          descricao_primeiro_motivo_glosa?: string | null
          descricao_tipo_glosa?: string | null
          diferenca?: number | null
          glosa_aceita?: number | null
          glosa_em_analise?: number | null
          glosa_mantida?: number | null
          glosa_pendente_retorno?: number | null
          glosa_recuperada?: number | null
          glosa_recursada?: number | null
          glosa_refaturada?: number | null
          glosa_submetida?: number | null
          grau_participacao?: number | null
          guia_associada?: string | null
          guia_recurso?: string | null
          id?: string
          id_guia?: string | null
          id_item?: string | null
          justificativa_aceite?: string | null
          justificativa_de_recurso?: string | null
          justificativa_recurso?: string | null
          mes_pagamento?: string | null
          nome_paciente?: string | null
          num_atendimento?: string | null
          num_conta?: string | null
          num_parcial_recurso?: number | null
          num_proc_complementar?: string | null
          protocolo_envio_recurso_item?: string | null
          protocolo_recurso_lote?: string | null
          qtde_faturada?: number | null
          qtde_paga?: number | null
          raw: Json
          situacao_envio_recurso?: string | null
          status_analise?: string | null
          tipo_guia?: string | null
          tipo_produto?: string | null
          tipo_tabela?: string | null
          upload_id: string
          usuario_envio_recurso_item?: string | null
          usuario_realizou_aceite?: string | null
          usuario_realizou_recurso?: string | null
          valor_apresentado?: number | null
          valor_faturado?: number | null
          valor_pago?: number | null
          vlr_unit_conv?: number | null
          vlr_unit_faturado?: number | null
        }
        Update: {
          centro_custos?: string | null
          codigo_centro_custos?: string | null
          codigo_item_convenio?: string | null
          codigo_motivo_glosa?: string | null
          codigo_motivo_glosa_tiss?: string | null
          codigo_operadora?: string | null
          comentario_de_aceite?: string | null
          complemento_motivo_glosa?: string | null
          conta_integralmente_glosada?: string | null
          convenio_nome?: string | null
          created_at?: string
          data_aceite?: string | null
          data_analise?: string | null
          data_atendimento?: string | null
          data_envio_recurso_item?: string | null
          data_envio_recurso_lote?: string | null
          data_pagamento?: string | null
          data_realizacao?: string | null
          data_recebimento?: string | null
          data_recurso?: string | null
          data_saida_guia?: string | null
          descricao_item_convenio?: string | null
          descricao_motivo_glosa?: string | null
          descricao_motivo_glosa_tiss?: string | null
          descricao_primeiro_motivo_glosa?: string | null
          descricao_tipo_glosa?: string | null
          diferenca?: number | null
          glosa_aceita?: number | null
          glosa_em_analise?: number | null
          glosa_mantida?: number | null
          glosa_pendente_retorno?: number | null
          glosa_recuperada?: number | null
          glosa_recursada?: number | null
          glosa_refaturada?: number | null
          glosa_submetida?: number | null
          grau_participacao?: number | null
          guia_associada?: string | null
          guia_recurso?: string | null
          id?: string
          id_guia?: string | null
          id_item?: string | null
          justificativa_aceite?: string | null
          justificativa_de_recurso?: string | null
          justificativa_recurso?: string | null
          mes_pagamento?: string | null
          nome_paciente?: string | null
          num_atendimento?: string | null
          num_conta?: string | null
          num_parcial_recurso?: number | null
          num_proc_complementar?: string | null
          protocolo_envio_recurso_item?: string | null
          protocolo_recurso_lote?: string | null
          qtde_faturada?: number | null
          qtde_paga?: number | null
          raw?: Json
          situacao_envio_recurso?: string | null
          status_analise?: string | null
          tipo_guia?: string | null
          tipo_produto?: string | null
          tipo_tabela?: string | null
          upload_id?: string
          usuario_envio_recurso_item?: string | null
          usuario_realizou_aceite?: string | null
          usuario_realizou_recurso?: string | null
          valor_apresentado?: number | null
          valor_faturado?: number | null
          valor_pago?: number | null
          vlr_unit_conv?: number | null
          vlr_unit_faturado?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "glosa_motivos_records_upload_id_fkey"
            columns: ["upload_id"]
            isOneToOne: false
            referencedRelation: "glosa_motivos_uploads"
            referencedColumns: ["id"]
          },
        ]
      }
      glosa_motivos_uploads: {
        Row: {
          created_at: string
          file_name: string
          id: string
          row_count: number
          uploaded_by: string
        }
        Insert: {
          created_at?: string
          file_name: string
          id?: string
          row_count?: number
          uploaded_by: string
        }
        Update: {
          created_at?: string
          file_name?: string
          id?: string
          row_count?: number
          uploaded_by?: string
        }
        Relationships: []
      }
      glosa_rec_dashboard_access: {
        Row: {
          granted_at: string
          granted_by: string | null
          user_id: string
        }
        Insert: {
          granted_at?: string
          granted_by?: string | null
          user_id: string
        }
        Update: {
          granted_at?: string
          granted_by?: string | null
          user_id?: string
        }
        Relationships: []
      }
      glosa_rec_metas: {
        Row: {
          ano_mes: string
          meta_valor: number
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          ano_mes: string
          meta_valor?: number
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          ano_mes?: string
          meta_valor?: number
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: []
      }
      glosa_rec_records: {
        Row: {
          conta_integralmente_glosada: string | null
          convenio_nome: string | null
          created_at: string
          data_atendimento: string | null
          data_pagamento: string | null
          data_saida_guia: string | null
          data_submissao_guia: string | null
          diferenca: number | null
          dt_envio: string | null
          dt_limite_envio: string | null
          dt_pgto_recurso: string | null
          dt_venc_recurso: string | null
          glosa_aceita: number | null
          glosa_em_analise: number | null
          glosa_mantida: number | null
          glosa_recuperada: number | null
          glosa_recursada: number | null
          glosa_refaturada: number | null
          glosa_submetida: number | null
          guia_associada: string | null
          guia_recurso: string | null
          id: string
          id_guia: string | null
          mes_envio: string | null
          mes_pagamento: string | null
          mes_pgto_recurso: string | null
          mes_venc_recurso: string | null
          nome_paciente: string | null
          num_conta: string | null
          num_parcial_recurso: number | null
          pendente_retorno: number | null
          prazo_recebimento: number | null
          protocolo_convenio: string | null
          protocolo_envio: string | null
          raw: Json
          recurso_vinculado: string | null
          situacao_guia: string | null
          status_analise: string | null
          status_conciliacao: string | null
          tipo_guia: string | null
          tipo_importacao: string | null
          upload_id: string
          valor_apresentado: number | null
          valor_faturado: number | null
          valor_pago: number | null
        }
        Insert: {
          conta_integralmente_glosada?: string | null
          convenio_nome?: string | null
          created_at?: string
          data_atendimento?: string | null
          data_pagamento?: string | null
          data_saida_guia?: string | null
          data_submissao_guia?: string | null
          diferenca?: number | null
          dt_envio?: string | null
          dt_limite_envio?: string | null
          dt_pgto_recurso?: string | null
          dt_venc_recurso?: string | null
          glosa_aceita?: number | null
          glosa_em_analise?: number | null
          glosa_mantida?: number | null
          glosa_recuperada?: number | null
          glosa_recursada?: number | null
          glosa_refaturada?: number | null
          glosa_submetida?: number | null
          guia_associada?: string | null
          guia_recurso?: string | null
          id?: string
          id_guia?: string | null
          mes_envio?: string | null
          mes_pagamento?: string | null
          mes_pgto_recurso?: string | null
          mes_venc_recurso?: string | null
          nome_paciente?: string | null
          num_conta?: string | null
          num_parcial_recurso?: number | null
          pendente_retorno?: number | null
          prazo_recebimento?: number | null
          protocolo_convenio?: string | null
          protocolo_envio?: string | null
          raw: Json
          recurso_vinculado?: string | null
          situacao_guia?: string | null
          status_analise?: string | null
          status_conciliacao?: string | null
          tipo_guia?: string | null
          tipo_importacao?: string | null
          upload_id: string
          valor_apresentado?: number | null
          valor_faturado?: number | null
          valor_pago?: number | null
        }
        Update: {
          conta_integralmente_glosada?: string | null
          convenio_nome?: string | null
          created_at?: string
          data_atendimento?: string | null
          data_pagamento?: string | null
          data_saida_guia?: string | null
          data_submissao_guia?: string | null
          diferenca?: number | null
          dt_envio?: string | null
          dt_limite_envio?: string | null
          dt_pgto_recurso?: string | null
          dt_venc_recurso?: string | null
          glosa_aceita?: number | null
          glosa_em_analise?: number | null
          glosa_mantida?: number | null
          glosa_recuperada?: number | null
          glosa_recursada?: number | null
          glosa_refaturada?: number | null
          glosa_submetida?: number | null
          guia_associada?: string | null
          guia_recurso?: string | null
          id?: string
          id_guia?: string | null
          mes_envio?: string | null
          mes_pagamento?: string | null
          mes_pgto_recurso?: string | null
          mes_venc_recurso?: string | null
          nome_paciente?: string | null
          num_conta?: string | null
          num_parcial_recurso?: number | null
          pendente_retorno?: number | null
          prazo_recebimento?: number | null
          protocolo_convenio?: string | null
          protocolo_envio?: string | null
          raw?: Json
          recurso_vinculado?: string | null
          situacao_guia?: string | null
          status_analise?: string | null
          status_conciliacao?: string | null
          tipo_guia?: string | null
          tipo_importacao?: string | null
          upload_id?: string
          valor_apresentado?: number | null
          valor_faturado?: number | null
          valor_pago?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "glosa_rec_records_upload_id_fkey"
            columns: ["upload_id"]
            isOneToOne: false
            referencedRelation: "glosa_rec_uploads"
            referencedColumns: ["id"]
          },
        ]
      }
      glosa_rec_uploads: {
        Row: {
          created_at: string
          file_name: string
          id: string
          row_count: number
          tipo_importacao: string | null
          uploaded_by: string
        }
        Insert: {
          created_at?: string
          file_name: string
          id?: string
          row_count?: number
          tipo_importacao?: string | null
          uploaded_by: string
        }
        Update: {
          created_at?: string
          file_name?: string
          id?: string
          row_count?: number
          tipo_importacao?: string | null
          uploaded_by?: string
        }
        Relationships: []
      }
      glosa_records: {
        Row: {
          "1ª Análise - Glosa Aceita": number | null
          analise_glosa_aceita: number | null
          analise_glosa_mantida: number | null
          analise_glosa_recuperada: number | null
          analise_glosa_recursada: number | null
          analise_glosa_refaturada: number | null
          analise_pendente_retorno: number | null
          analise_soma_aceites_recursos: number | null
          "Apresentado (Demonstrativo)": number | null
          "Centro de custos": string | null
          centro_custos: string | null
          codigo_motivo_glosa: string | null
          codigo_setor_interno: string | null
          comentario_aceite: string | null
          complemento_motivo_glosa: string | null
          "Conta Integralmente Glosada": string | null
          conta_integralmente_glosada: string | null
          convenio_nome: string | null
          created_at: string
          "Data Envio Recurso Item": string | null
          "Data Envio Recurso Lote": string | null
          "Data Pagto.": string | null
          "Data Refaturamento": string | null
          "Data última atualização dados": string | null
          data_aceite: string | null
          data_analise: string | null
          data_atendimento: string | null
          data_envio_recurso_item: string | null
          data_envio_recurso_lote: string | null
          data_pagamento: string | null
          data_realizacao: string | null
          data_recurso: string | null
          data_refaturamento: string | null
          data_saida_guia: string | null
          data_ultima_atualizacao: string | null
          descricao_motivo_glosa: string | null
          descricao_setor_interno: string | null
          diferenca: number | null
          "Discriminador Guia": string | null
          discriminador_guia: string | null
          "Dt. Recurso": string | null
          "Dt.Aceite": string | null
          "Dt.Atendimento": string | null
          "Dt.Realizacao": string | null
          "Glosa Submetida": number | null
          glosa_submetida: number | null
          "Guia é de Recurso": string | null
          guia_recurso: string | null
          id: string
          justificativa_aceite: string | null
          justificativa_recurso: string | null
          "Mês Pgto.": string | null
          mes_pagamento: string | null
          "Nº Parcial de Recurso": number | null
          "Nome do Convenio": string | null
          nome_paciente: string | null
          num_conta: string | null
          num_parcial_item_recurso: number | null
          num_parcial_recurso: number | null
          "Num. Conta": string | null
          operadora_grupo: string | null
          "Protocolo de Recurso Lote": string | null
          "Protocolo Envio Recurso Item": string | null
          protocolo_envio_recurso_item: string | null
          protocolo_recurso_lote: string | null
          qtde_faturada: number | null
          qtde_paga: number | null
          "Qtde. Faturada": number | null
          "Qtde. Paga": number | null
          raw: Json
          "Situação da Guia": string | null
          situacao_guia: string | null
          "Status de Analise": string | null
          status_analise: string | null
          "Tipo de Guia": string | null
          tipo_glosa_origem: string | null
          tipo_guia: string | null
          tipo_importacao: string | null
          tipo_produto: string | null
          upload_id: string
          "Usuario Analise": string | null
          "Usuario Envio Recurso Item": string | null
          "Usuário Realizou Recurso": string | null
          usuario_aceite: string | null
          usuario_analise: string | null
          usuario_envio_recurso_item: string | null
          usuario_recurso: string | null
          usuario_refaturamento: string | null
          "Valor Faturado": number | null
          "Valor Pago": number | null
          valor_apresentado: number | null
          valor_faturado: number | null
          valor_pago: number | null
          vlr_unit_faturado: number | null
          vlr_unit_pago: number | null
          "Vlr. Unit. Faturado": number | null
          "Vlr. Unit. Pago": number | null
        }
        Insert: {
          "1ª Análise - Glosa Aceita"?: number | null
          analise_glosa_aceita?: number | null
          analise_glosa_mantida?: number | null
          analise_glosa_recuperada?: number | null
          analise_glosa_recursada?: number | null
          analise_glosa_refaturada?: number | null
          analise_pendente_retorno?: number | null
          analise_soma_aceites_recursos?: number | null
          "Apresentado (Demonstrativo)"?: number | null
          "Centro de custos"?: string | null
          centro_custos?: string | null
          codigo_motivo_glosa?: string | null
          codigo_setor_interno?: string | null
          comentario_aceite?: string | null
          complemento_motivo_glosa?: string | null
          "Conta Integralmente Glosada"?: string | null
          conta_integralmente_glosada?: string | null
          convenio_nome?: string | null
          created_at?: string
          "Data Envio Recurso Item"?: string | null
          "Data Envio Recurso Lote"?: string | null
          "Data Pagto."?: string | null
          "Data Refaturamento"?: string | null
          "Data última atualização dados"?: string | null
          data_aceite?: string | null
          data_analise?: string | null
          data_atendimento?: string | null
          data_envio_recurso_item?: string | null
          data_envio_recurso_lote?: string | null
          data_pagamento?: string | null
          data_realizacao?: string | null
          data_recurso?: string | null
          data_refaturamento?: string | null
          data_saida_guia?: string | null
          data_ultima_atualizacao?: string | null
          descricao_motivo_glosa?: string | null
          descricao_setor_interno?: string | null
          diferenca?: number | null
          "Discriminador Guia"?: string | null
          discriminador_guia?: string | null
          "Dt. Recurso"?: string | null
          "Dt.Aceite"?: string | null
          "Dt.Atendimento"?: string | null
          "Dt.Realizacao"?: string | null
          "Glosa Submetida"?: number | null
          glosa_submetida?: number | null
          "Guia é de Recurso"?: string | null
          guia_recurso?: string | null
          id?: string
          justificativa_aceite?: string | null
          justificativa_recurso?: string | null
          "Mês Pgto."?: string | null
          mes_pagamento?: string | null
          "Nº Parcial de Recurso"?: number | null
          "Nome do Convenio"?: string | null
          nome_paciente?: string | null
          num_conta?: string | null
          num_parcial_item_recurso?: number | null
          num_parcial_recurso?: number | null
          "Num. Conta"?: string | null
          operadora_grupo?: string | null
          "Protocolo de Recurso Lote"?: string | null
          "Protocolo Envio Recurso Item"?: string | null
          protocolo_envio_recurso_item?: string | null
          protocolo_recurso_lote?: string | null
          qtde_faturada?: number | null
          qtde_paga?: number | null
          "Qtde. Faturada"?: number | null
          "Qtde. Paga"?: number | null
          raw: Json
          "Situação da Guia"?: string | null
          situacao_guia?: string | null
          "Status de Analise"?: string | null
          status_analise?: string | null
          "Tipo de Guia"?: string | null
          tipo_glosa_origem?: string | null
          tipo_guia?: string | null
          tipo_importacao?: string | null
          tipo_produto?: string | null
          upload_id: string
          "Usuario Analise"?: string | null
          "Usuario Envio Recurso Item"?: string | null
          "Usuário Realizou Recurso"?: string | null
          usuario_aceite?: string | null
          usuario_analise?: string | null
          usuario_envio_recurso_item?: string | null
          usuario_recurso?: string | null
          usuario_refaturamento?: string | null
          "Valor Faturado"?: number | null
          "Valor Pago"?: number | null
          valor_apresentado?: number | null
          valor_faturado?: number | null
          valor_pago?: number | null
          vlr_unit_faturado?: number | null
          vlr_unit_pago?: number | null
          "Vlr. Unit. Faturado"?: number | null
          "Vlr. Unit. Pago"?: number | null
        }
        Update: {
          "1ª Análise - Glosa Aceita"?: number | null
          analise_glosa_aceita?: number | null
          analise_glosa_mantida?: number | null
          analise_glosa_recuperada?: number | null
          analise_glosa_recursada?: number | null
          analise_glosa_refaturada?: number | null
          analise_pendente_retorno?: number | null
          analise_soma_aceites_recursos?: number | null
          "Apresentado (Demonstrativo)"?: number | null
          "Centro de custos"?: string | null
          centro_custos?: string | null
          codigo_motivo_glosa?: string | null
          codigo_setor_interno?: string | null
          comentario_aceite?: string | null
          complemento_motivo_glosa?: string | null
          "Conta Integralmente Glosada"?: string | null
          conta_integralmente_glosada?: string | null
          convenio_nome?: string | null
          created_at?: string
          "Data Envio Recurso Item"?: string | null
          "Data Envio Recurso Lote"?: string | null
          "Data Pagto."?: string | null
          "Data Refaturamento"?: string | null
          "Data última atualização dados"?: string | null
          data_aceite?: string | null
          data_analise?: string | null
          data_atendimento?: string | null
          data_envio_recurso_item?: string | null
          data_envio_recurso_lote?: string | null
          data_pagamento?: string | null
          data_realizacao?: string | null
          data_recurso?: string | null
          data_refaturamento?: string | null
          data_saida_guia?: string | null
          data_ultima_atualizacao?: string | null
          descricao_motivo_glosa?: string | null
          descricao_setor_interno?: string | null
          diferenca?: number | null
          "Discriminador Guia"?: string | null
          discriminador_guia?: string | null
          "Dt. Recurso"?: string | null
          "Dt.Aceite"?: string | null
          "Dt.Atendimento"?: string | null
          "Dt.Realizacao"?: string | null
          "Glosa Submetida"?: number | null
          glosa_submetida?: number | null
          "Guia é de Recurso"?: string | null
          guia_recurso?: string | null
          id?: string
          justificativa_aceite?: string | null
          justificativa_recurso?: string | null
          "Mês Pgto."?: string | null
          mes_pagamento?: string | null
          "Nº Parcial de Recurso"?: number | null
          "Nome do Convenio"?: string | null
          nome_paciente?: string | null
          num_conta?: string | null
          num_parcial_item_recurso?: number | null
          num_parcial_recurso?: number | null
          "Num. Conta"?: string | null
          operadora_grupo?: string | null
          "Protocolo de Recurso Lote"?: string | null
          "Protocolo Envio Recurso Item"?: string | null
          protocolo_envio_recurso_item?: string | null
          protocolo_recurso_lote?: string | null
          qtde_faturada?: number | null
          qtde_paga?: number | null
          "Qtde. Faturada"?: number | null
          "Qtde. Paga"?: number | null
          raw?: Json
          "Situação da Guia"?: string | null
          situacao_guia?: string | null
          "Status de Analise"?: string | null
          status_analise?: string | null
          "Tipo de Guia"?: string | null
          tipo_glosa_origem?: string | null
          tipo_guia?: string | null
          tipo_importacao?: string | null
          tipo_produto?: string | null
          upload_id?: string
          "Usuario Analise"?: string | null
          "Usuario Envio Recurso Item"?: string | null
          "Usuário Realizou Recurso"?: string | null
          usuario_aceite?: string | null
          usuario_analise?: string | null
          usuario_envio_recurso_item?: string | null
          usuario_recurso?: string | null
          usuario_refaturamento?: string | null
          "Valor Faturado"?: number | null
          "Valor Pago"?: number | null
          valor_apresentado?: number | null
          valor_faturado?: number | null
          valor_pago?: number | null
          vlr_unit_faturado?: number | null
          vlr_unit_pago?: number | null
          "Vlr. Unit. Faturado"?: number | null
          "Vlr. Unit. Pago"?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "glosa_records_upload_id_fkey"
            columns: ["upload_id"]
            isOneToOne: false
            referencedRelation: "glosa_uploads"
            referencedColumns: ["id"]
          },
        ]
      }
      glosa_uploads: {
        Row: {
          created_at: string
          file_name: string
          id: string
          row_count: number
          tipo_importacao: string | null
          uploaded_by: string
        }
        Insert: {
          created_at?: string
          file_name: string
          id?: string
          row_count?: number
          tipo_importacao?: string | null
          uploaded_by: string
        }
        Update: {
          created_at?: string
          file_name?: string
          id?: string
          row_count?: number
          tipo_importacao?: string | null
          uploaded_by?: string
        }
        Relationships: []
      }
      motivos_glosa: {
        Row: {
          codigo: string
          created_at: string
          descricao: string
          id: string
          updated_at: string
        }
        Insert: {
          codigo: string
          created_at?: string
          descricao: string
          id?: string
          updated_at?: string
        }
        Update: {
          codigo?: string
          created_at?: string
          descricao?: string
          id?: string
          updated_at?: string
        }
        Relationships: []
      }
      notifications: {
        Row: {
          created_at: string
          id: string
          link: string | null
          message: string | null
          read_at: string | null
          title: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          link?: string | null
          message?: string | null
          read_at?: string | null
          title: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          link?: string | null
          message?: string | null
          read_at?: string | null
          title?: string
          user_id?: string
        }
        Relationships: []
      }
      operadoras: {
        Row: {
          cod_operadora: string | null
          created_at: string
          id: string
          nome: string
          prazo_contratual_envio_recurso: number
          prazo_ideal_envio_recurso: number
          updated_at: string
        }
        Insert: {
          cod_operadora?: string | null
          created_at?: string
          id?: string
          nome: string
          prazo_contratual_envio_recurso: number
          prazo_ideal_envio_recurso: number
          updated_at?: string
        }
        Update: {
          cod_operadora?: string | null
          created_at?: string
          id?: string
          nome?: string
          prazo_contratual_envio_recurso?: number
          prazo_ideal_envio_recurso?: number
          updated_at?: string
        }
        Relationships: []
      }
      prazos_operadoras_records: {
        Row: {
          beneficiario: string | null
          cod_carteira: string | null
          cod_operadora: string | null
          conta: string | null
          created_at: string | null
          data_atendimento: string | null
          data_envio_recurso: string | null
          data_pagamento: string | null
          glosa_aceita: number | null
          glosa_mantida: number | null
          glosa_recuperada: number | null
          glosa_recursada: number | null
          glosa_submetida: number | null
          guia_convenio: string | null
          guia_e_recurso: string | null
          id: string
          lote_convenio: string | null
          mes_pagamento: string | null
          operadora_nome: string | null
          pendente_retorno: number | null
          protocolo_convenio: string | null
          protocolo_recurso: string | null
          saldo_glosa: number | null
          sem_registro_envio: string | null
          status_analise: string | null
          upload_id: string | null
          valor_faturado: number | null
          valor_pago: number | null
        }
        Insert: {
          beneficiario?: string | null
          cod_carteira?: string | null
          cod_operadora?: string | null
          conta?: string | null
          created_at?: string | null
          data_atendimento?: string | null
          data_envio_recurso?: string | null
          data_pagamento?: string | null
          glosa_aceita?: number | null
          glosa_mantida?: number | null
          glosa_recuperada?: number | null
          glosa_recursada?: number | null
          glosa_submetida?: number | null
          guia_convenio?: string | null
          guia_e_recurso?: string | null
          id?: string
          lote_convenio?: string | null
          mes_pagamento?: string | null
          operadora_nome?: string | null
          pendente_retorno?: number | null
          protocolo_convenio?: string | null
          protocolo_recurso?: string | null
          saldo_glosa?: number | null
          sem_registro_envio?: string | null
          status_analise?: string | null
          upload_id?: string | null
          valor_faturado?: number | null
          valor_pago?: number | null
        }
        Update: {
          beneficiario?: string | null
          cod_carteira?: string | null
          cod_operadora?: string | null
          conta?: string | null
          created_at?: string | null
          data_atendimento?: string | null
          data_envio_recurso?: string | null
          data_pagamento?: string | null
          glosa_aceita?: number | null
          glosa_mantida?: number | null
          glosa_recuperada?: number | null
          glosa_recursada?: number | null
          glosa_submetida?: number | null
          guia_convenio?: string | null
          guia_e_recurso?: string | null
          id?: string
          lote_convenio?: string | null
          mes_pagamento?: string | null
          operadora_nome?: string | null
          pendente_retorno?: number | null
          protocolo_convenio?: string | null
          protocolo_recurso?: string | null
          saldo_glosa?: number | null
          sem_registro_envio?: string | null
          status_analise?: string | null
          upload_id?: string | null
          valor_faturado?: number | null
          valor_pago?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "fk_prazos_upload"
            columns: ["upload_id"]
            isOneToOne: false
            referencedRelation: "prazos_operadoras_uploads"
            referencedColumns: ["id"]
          },
        ]
      }
      prazos_operadoras_uploads: {
        Row: {
          created_at: string | null
          created_by: string | null
          file_name: string
          id: string
          row_count: number
          tipo_importacao: string | null
        }
        Insert: {
          created_at?: string | null
          created_by?: string | null
          file_name: string
          id?: string
          row_count?: number
          tipo_importacao?: string | null
        }
        Update: {
          created_at?: string | null
          created_by?: string | null
          file_name?: string
          id?: string
          row_count?: number
          tipo_importacao?: string | null
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          email: string | null
          full_name: string | null
          id: string
          login: string | null
          operadoras_responsaveis: string[] | null
          phone: string | null
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          email?: string | null
          full_name?: string | null
          id: string
          login?: string | null
          operadoras_responsaveis?: string[] | null
          phone?: string | null
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          email?: string | null
          full_name?: string | null
          id?: string
          login?: string | null
          operadoras_responsaveis?: string[] | null
          phone?: string | null
        }
        Relationships: []
      }
      setores: {
        Row: {
          created_at: string
          gestor: string
          id: string
          nome: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          gestor: string
          id?: string
          nome: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          gestor?: string
          id?: string
          nome?: string
          updated_at?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "admin" | "client" | "user"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      app_role: ["admin", "client", "user"],
    },
  },
} as const
