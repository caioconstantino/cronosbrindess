# Simplificar personalização por quantidade de cores

## Alterações
- Remover do site a escolha de cores pelo cliente e permitir adicionar produtos diretamente ao orçamento.
- Remover do cadastro de produto qualquer configuração de cores; todos os produtos terão limite fixo de 4 cores.
- No editor de pedido, substituir as amostras de cores por uma seleção da quantidade de cores, entre 1 e o limite definido no produto.
- Salvar a escolha no pedido como “Quantidade de cores”, preservando as outras opções de personalização.
- Manter os cadastros existentes no banco sem removê-los, evitando perda de dados, mas deixar de usá-los neste fluxo.

## Validação
- Conferir o cadastro de produto, a inclusão pelo cliente e a edição de um item no pedido.
- Verificar compilação e erros do aplicativo.

## Detalhes técnicos
- O valor será persistido em `selected_variants` com uma chave própria de quantidade.
- Valores antigos em `Cores` serão removidos ao escolher a nova quantidade para evitar informações conflitantes.
