import * as tl from 'azure-pipelines-task-lib';
import { RestClient, IRequestOptions } from 'typed-rest-client/RestClient';
import { ExpAuthorizer } from './expauthorizer';

export enum ExperimentAction {
    Start = "Start",
    Advance = "Advance",
    Stop = "Stop",
    StopAllExperiments = "StopAllExperiments"
}

export default class ExperimentManager {
    constructor(featureId: string, progressionId: string, serviceConnectionId: string, userAgent: string) {
        this._restClient = new RestClient(userAgent);
        this._expAuthorizer = new ExpAuthorizer(serviceConnectionId, userAgent);
        this._featureId = featureId;
        this._progressionId = progressionId;
    }

    public async executeAction(action: ExperimentAction, experimentId: string): Promise<void> {
        let requestUrl = `https://exp.microsoft.com/api/experiments/${experimentId}`;
        let accessToken = await this._expAuthorizer.getAccessToken();
        let options: IRequestOptions = {
            additionalHeaders: {
                'authorization': `Bearer ${accessToken}`
            }
        };

        switch(action) {
            case ExperimentAction.Start: { 
                requestUrl = `${requestUrl}/start`; 
                break; 
            }
            case ExperimentAction.Advance: { 
                requestUrl = `${requestUrl}/advance`; 
                break; 
            }
            case ExperimentAction.Stop: { 
                requestUrl = `${requestUrl}/stop`; 
                break; 
            }
            default: {
                throw new Error(tl.loc('InvalidAction', action));
            }
        }

        console.log(tl.loc('InitiateAction', ExperimentAction[action], experimentId));
        tl.debug(`[POST] ${requestUrl}`);
        let response = await this._restClient.create(requestUrl, null, options);
        console.log(tl.loc('InitiatedAction', ExperimentAction[action], experimentId));
        tl.debug(JSON.stringify(response));
    }

    /**
     * @param experimentName filter by experiment name
     */
    public async getExperiments(experimentName?: string): Promise<any[]> {
        let requestUrl = `https://exp.microsoft.com/api/features/${this._featureId}/progressions/${this._progressionId}`;
        let accessToken = await this._expAuthorizer.getAccessToken();
        let options: IRequestOptions = {
            additionalHeaders: {
                'authorization': `Bearer ${accessToken}`
            }
        };

        tl.debug(`[GET] ${requestUrl}`);
        let response = await this._restClient.get(requestUrl, options);
        tl.debug(JSON.stringify(response));

        let progression = response.result as any;

        if (!!progression.Studies && progression.Studies.length > 0) {
            let experiments = progression.Studies as any[];
            if (!!experimentName) {
                experiments = experiments.filter(e => e.Name == experimentName);
                if (experiments.length === 0) {
                    throw new Error(`Experiment '${experimentName}' not found in the progression ${this._progressionId} and feature ${this._featureId}`);
                }
            }
    
            tl.debug(`Experiment: ${JSON.stringify(experiments)}`);
            return experiments;
        }

        throw new Error( `No experiments found in the progression ${this._progressionId} and feature ${this._featureId}`);
    }

    private _restClient: RestClient;
    private _expAuthorizer: ExpAuthorizer;
    private _featureId: string;
    private _progressionId: string;
}