import React, { useState, useEffect } from 'react';
import { StyleSheet, Text, View, TouchableOpacity, ScrollView, Alert } from 'react-native';
import * as Speech from 'expo-speech';
import * as DocumentPicker from 'expo-document-picker';

export default function App() {
  const [texto, setTexto] = useState('Cole seu texto aqui ou importe um arquivo TXT');
  const [falando, setFalando] = useState(false);
  const [pausado, setPausado] = useState(false);
  const [modoEscuro, setModoEscuro] = useState(true);

  useEffect(() => {
    return () => {
      Speech.stop();
    };
  }, []);

  const escolherArquivo = async () => {
    try {
      const resultado = await DocumentPicker.getDocumentAsync({
        type: 'text/plain',
        copyToCacheDirectory: true
      });

      if (!resultado.canceled && resultado.assets[0]) {
        const arquivo = resultado.assets[0];
        const response = await fetch(arquivo.uri);
        const conteudo = await response.text();
        setTexto(conteudo);
        Alert.alert('Sucesso', 'Arquivo carregado!');
      }
    } catch (erro) {
      Alert.alert('Erro', 'Não foi possível ler o arquivo');
    }
  };

  const iniciarLeitura = () => {
    if (texto.trim() === '') {
      Alert.alert('Atenção', 'Digite ou importe um texto primeiro');
      return;
    }

    Speech.stop();
    Speech.speak(texto, {
      language: 'pt-BR',
      pitch: 1.0,
      rate: 1.0,
      onStart: () => {
        setFalando(true);
        setPausado(false);
      },
      onDone: () => {
        setFalando(false);
        setPausado(false);
      },
      onStopped: () => {
        setFalando(false);
        setPausado(false);
      },
      onError: () => {
        setFalando(false);
        setPausado(false);
        Alert.alert('Erro', 'Erro na síntese de voz');
      }
    });
  };

  const pausarRetomar = async () => {
    if (pausado) {
      await Speech.resume();
      setPausado(false);
    } else {
      await Speech.pause();
      setPausado(true);
    }
  };

  const pararLeitura = () => {
    Speech.stop();
    setFalando(false);
    setPausado(false);
  };

  const tema = modoEscuro? temaEscuro : temaClaro;

  return (
    <View style={[styles.container, { backgroundColor: tema.fundo }]}>
      <View style={styles.header}>
        <Text style={[styles.titulo, { color: tema.destaque }]}>Leitor Pro Max</Text>
        <TouchableOpacity style={[styles.botaoTema, { backgroundColor: tema.botao }]} onPress={() => setModoEscuro(!modoEscuro)}>
          <Text style={[styles.textoBotao, { color: tema.textoBotao }]}>{modoEscuro? '☀️ Claro' : '🌙 Escuro'}</Text>
        </TouchableOpacity>
      </View>

      <ScrollView style={[styles.caixaTexto, { backgroundColor: tema.caixa }]}>
        <Text style={[styles.texto, { color: tema.texto }]}>{texto}</Text>
      </ScrollView>

      <TouchableOpacity style={[styles.botaoArquivo, { backgroundColor: tema.botao }]} onPress={escolherArquivo}>
        <Text style={[styles.textoBotao, { color: tema.textoBotao }]}>📄 Importar TXT</Text>
      </TouchableOpacity>

      <View style={styles.controles}>
        {!falando? (
          <TouchableOpacity style={[styles.botao, { backgroundColor: tema.botaoLer }]} onPress={iniciarLeitura}>
            <Text style={[styles.textoBotao, { color: '#fff' }]}>▶️ Ler</Text>
          </TouchableOpacity>
        ) : (
          <>
            <TouchableOpacity style={[styles.botao, { backgroundColor: tema.botao }]} onPress={pausarRetomar}>
              <Text style={[styles.textoBotao, { color: tema.textoBotao }]}>{pausado? '▶️ Continuar' : '⏸️ Pausar'}</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.botao, { backgroundColor: tema.botaoParar }]} onPress={pararLeitura}>
              <Text style={[styles.textoBotao, { color: '#fff' }]}>⏹️ Parar</Text>
            </TouchableOpacity>
          </>
        )}
      </View>
    </View>
  );
}

const temaEscuro = {
  fundo: '#1a1a1a',
  caixa: '#2a2a2a',
  texto: '#ffffff',
  destaque: '#00ff88',
  botao: '#444444',
  botaoLer: '#00aa44',
  botaoParar: '#cc0000',
  textoBotao: '#ffffff'
};

const temaClaro = {
  fundo: '#ffffff',
  caixa: '#f0f0f0',
  texto: '#000000',
  destaque: '#0066cc',
  botao: '#dddddd',
  botaoLer: '#00aa44',
  botaoParar: '#cc0000',
  textoBotao: '#000000'
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    paddingTop: 50
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20
  },
  titulo: {
    fontSize: 28,
    fontWeight: 'bold'
  },
  botaoTema: {
    padding: 10,
    borderRadius: 8
  },
  caixaTexto: {
    flex: 1,
    borderRadius: 10,
    padding: 15,
    marginBottom: 15
  },
  texto: {
    fontSize: 16,
    lineHeight: 24
  },
  botaoArquivo: {
    padding: 15,
    borderRadius: 10,
    marginBottom: 15
  },
  controles: {
    flexDirection: 'row',
    justifyContent: 'space-around'
  },
  botao: {
    padding: 15,
    borderRadius: 10,
    flex: 1,
    marginHorizontal: 5
  },
  textoBotao: {
    textAlign: 'center',
    fontSize: 16,
    fontWeight: 'bold'
  }
});
